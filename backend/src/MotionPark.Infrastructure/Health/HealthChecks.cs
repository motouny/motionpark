using Microsoft.Extensions.Diagnostics.HealthChecks;
using MotionPark.Application.Abstractions;
using StackExchange.Redis;

namespace MotionPark.Infrastructure.Health;

public sealed class RedisHealthCheck(IConnectionMultiplexer? redis) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (redis is null || !redis.IsConnected)
            return HealthCheckResult.Unhealthy("Redis is not connected.");
        try
        {
            await redis.GetDatabase().PingAsync();
            return HealthCheckResult.Healthy("Redis is reachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis ping failed.", ex);
        }
    }
}

/// <summary>Odoo reachability is degraded-not-fatal by design: the platform serves cached read models.</summary>
public sealed class OdooHealthCheck(IOdooClient odoo) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));
        try
        {
            var ok = await odoo.PingAsync(cts.Token);
            return ok
                ? HealthCheckResult.Healthy("Odoo XML-RPC reachable and authenticated.")
                : HealthCheckResult.Unhealthy("Odoo reachable but authentication failed (check ODOO credentials).");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("Odoo ping timed out after 10s.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Odoo ping failed.", ex);
        }
    }
}
