using MotionPark.Domain.Common;

namespace MotionPark.Domain.System;

public class Notification : Entity
{
    public Guid? UserId { get; set; }                         // null = broadcast to admins
    public string Type { get; set; } = string.Empty;          // membership.activated, booking.confirmed...
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? BodyAr { get; set; }
    public string? BodyEn { get; set; }
    public string? Data { get; set; }                         // jsonb
    public NotificationChannel Channel { get; set; } = NotificationChannel.InApp;
    public NotificationStatus Status { get; set; } = NotificationStatus.Queued;
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
}

public class AuditLog : Entity
{
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;        // Created/Updated/Deleted/...
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? Changes { get; set; }                      // jsonb {field: {old,new}}
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
