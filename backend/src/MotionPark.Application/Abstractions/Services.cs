using MotionPark.Domain;
using MotionPark.Domain.Identity;

namespace MotionPark.Application.Abstractions;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    string? Phone { get; }
    IReadOnlyCollection<string> Roles { get; }
    bool IsInRole(string role);
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
}

public interface IDateTime
{
    DateTime UtcNow { get; }
}

public interface IAuditLogger
{
    Task LogAsync(string entity, string entityId, string action, object? changes = null, CancellationToken ct = default);
}

/// <summary>Raises user notifications: persists to the outbox and attempts delivery per channel config.</summary>
public interface INotificationService
{
    Task NotifyAsync(Guid? userId, string type, string titleAr, string titleEn,
        string? bodyAr = null, string? bodyEn = null, NotificationChannel channel = NotificationChannel.InApp,
        object? data = null, CancellationToken ct = default);
}

public interface ILockProvider
{
    /// <summary>Try to acquire an exclusive lock. Returns a handle to release, or null when not acquired.</summary>
    Task<IAsyncDisposable?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken ct = default);
}
