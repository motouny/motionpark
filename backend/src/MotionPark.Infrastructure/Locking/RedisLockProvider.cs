using System.Collections.Concurrent;
using StackExchange.Redis;
using MotionPark.Application.Abstractions;

namespace MotionPark.Infrastructure.Locking;

/// <summary>
/// Distributed lock via Redis SET NX PX, with an in-process keyed-semaphore fallback when
/// Redis is unreachable (single-node deployment keeps correctness; horizontal scaling uses Redis).
/// </summary>
public sealed class RedisLockProvider : ILockProvider, IDisposable
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _local = new();
    private bool _redisUsable = true;

    public RedisLockProvider(IConnectionMultiplexer? redis) => _redis = redis;

    public async Task<IAsyncDisposable?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken ct = default)
    {
        if (_redis is not null && _redisUsable && _redis.IsConnected)
        {
            try
            {
                var db = _redis.GetDatabase();
                var token = Guid.NewGuid().ToString("N");
                var acquired = await db.StringSetAsync($"lock:{key}", token, ttl, When.NotExists);
                if (acquired) return new RedisLockHandle(db, $"lock:{key}", token);
                return null;
            }
            catch (RedisException)
            {
                _redisUsable = false; // fall through to local lock
            }
            catch (TimeoutException)
            {
                _redisUsable = false;
            }
        }

        var sem = _local.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        if (!await sem.WaitAsync(TimeSpan.FromSeconds(5), ct)) return null;
        var released = false;
        _ = Task.Delay(ttl, ct).ContinueWith(_ =>
        {
            if (!released) sem.Release();
        }, TaskContinuationOptions.None);
        return new LocalLockHandle(() =>
        {
            released = true;
            sem.Release();
        });
    }

    public void Dispose() { }

    private sealed class RedisLockHandle(IDatabase db, string key, string token) : IAsyncDisposable
    {
        private int _released;
        public async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _released, 1) == 1) return;
            const string script = """
                if redis.call("get", KEYS[1]) == ARGV[1] then
                    return redis.call("del", KEYS[1])
                else
                    return 0
                end
                """;
            try { await db.ScriptEvaluateAsync(script, [key], [token]); }
            catch (RedisException) { /* lock expires via PX anyway */ }
        }
    }

    private sealed class LocalLockHandle(Action release) : IAsyncDisposable
    {
        private int _released;
        public ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0) release();
            return ValueTask.CompletedTask;
        }
    }
}
