using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;

namespace MotionPark.Infrastructure.Services;

public sealed class SystemDateTime : IDateTime
{
    public DateTime UtcNow => DateTime.UtcNow;
}

/// <summary>Writes notifications to the outbox. InApp items are delivered immediately; other channels are picked up by the background job (or marked Blocked/NotConfigured).</summary>
public sealed class NotificationService(IApplicationDbContext db) : INotificationService
{
    public async Task NotifyAsync(Guid? userId, string type, string titleAr, string titleEn,
        string? bodyAr = null, string? bodyEn = null, NotificationChannel channel = NotificationChannel.InApp,
        object? data = null, CancellationToken ct = default)
    {
        db.Notifications.Add(new Domain.System.Notification
        {
            UserId = userId,
            Type = type,
            TitleAr = titleAr,
            TitleEn = titleEn,
            BodyAr = bodyAr,
            BodyEn = bodyEn,
            Channel = channel,
            Status = channel == NotificationChannel.InApp ? NotificationStatus.Sent : NotificationStatus.Queued,
            Data = data is null ? null : Json.Stringify(data),
            SentAt = channel == NotificationChannel.InApp ? DateTime.UtcNow : null,
        });
        await db.SaveChangesAsync(ct);
    }
}

public sealed class AuditLogger(IApplicationDbContext db, ICurrentUserService currentUser) : IAuditLogger
{
    public async Task LogAsync(string entity, string entityId, string action, object? changes = null,
        CancellationToken ct = default)
    {
        db.AuditLogs.Add(new Domain.System.AuditLog
        {
            Entity = entity,
            EntityId = entityId,
            Action = action,
            ActorUserId = currentUser.UserId,
            ActorName = currentUser.Email,
            Changes = changes is null ? null : Json.Stringify(changes),
            Timestamp = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>Outbox delivery for Email/Sms/WhatsApp. Email via SMTP only when configured; others log and mark NotConfigured.</summary>
public interface IOutboxDispatcher
{
    Task DispatchPendingAsync(CancellationToken ct);
}

public sealed class OutboxDispatcher(IApplicationDbContext db, IConfiguration config, ILogger<OutboxDispatcher> logger)
    : IOutboxDispatcher
{
    public async Task DispatchPendingAsync(CancellationToken ct)
    {
        var pending = await db.Notifications
            .Where(n => n.Status == NotificationStatus.Queued)
            .OrderBy(n => n.CreatedAt)
            .Take(25)
            .ToListAsync(ct);

        foreach (var n in pending)
        {
            try
            {
                switch (n.Channel)
                {
                    case NotificationChannel.Email:
                        await SendEmailAsync(n, ct);
                        break;
                    default:
                        logger.LogInformation("Channel {Channel} not configured for notification {Id} ({Type})",
                            n.Channel, n.Id, n.Type);
                        n.Status = NotificationStatus.NotConfigured;
                        n.Error = "Channel not configured";
                        break;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to dispatch notification {Id}", n.Id);
                n.Status = NotificationStatus.Failed;
                n.Error = ex.Message;
            }
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task SendEmailAsync(Domain.System.Notification n, CancellationToken ct)
    {
        var host = config["SMTP_HOST"];
        if (string.IsNullOrWhiteSpace(host))
        {
            n.Status = NotificationStatus.Blocked;
            n.Error = "SMTP not configured";
            return;
        }

        using var client = new System.Net.Mail.SmtpClient(host)
        {
            Port = int.TryParse(config["SMTP_PORT"], out var p) ? p : 587,
            EnableSsl = (config["SMTP_ENABLE_SSL"] ?? "true") != "false",
        };
        if (!string.IsNullOrWhiteSpace(config["SMTP_USER"]))
            client.Credentials = new System.Net.NetworkCredential(config["SMTP_USER"], config["SMTP_PASSWORD"]);

        var email = await db.Users.Where(u => u.Id == n.UserId).Select(u => u.Email).FirstOrDefaultAsync(ct);
        if (string.IsNullOrEmpty(email) || !email.Contains('@'))
        {
            n.Status = NotificationStatus.Blocked;
            n.Error = "No recipient email";
            return;
        }

        var from = config["SMTP_FROM"] ?? config["SMTP_USER"] ?? "no-reply@motionpark.local";
        var mail = new System.Net.Mail.MailMessage(from, email, n.TitleEn, $"{n.TitleAr}\n\n{n.BodyAr}\n\n{n.BodyEn}");
        await client.SendMailAsync(mail, ct);
        n.Status = NotificationStatus.Sent;
        n.SentAt = DateTime.UtcNow;
    }
}
