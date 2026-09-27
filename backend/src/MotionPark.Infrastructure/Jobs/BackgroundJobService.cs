using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Memberships;
using MotionPark.Domain;
using MotionPark.Domain.Customers;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Infrastructure.Services;

namespace MotionPark.Infrastructure.Jobs;

/// <summary>
/// Background worker: Odoo sync-job queue (retry with exponential backoff), notification outbox,
/// and subscription-expiry flips. All state lives in PostgreSQL — safe to restart mid-flight.
/// </summary>
public sealed class BackgroundJobService(
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundJobService> logger) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(15);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); // let bootstrap/migrations finish first
        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var odoo = scope.ServiceProvider.GetRequiredService<IOdooClient>();
                var sender = scope.ServiceProvider.GetRequiredService<ISender>();
                var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var outbox = scope.ServiceProvider.GetRequiredService<OutboxDispatcher>();

                await ProcessSyncJobsAsync(db, odoo, sender, notifications, stoppingToken);
                await outbox.DispatchPendingAsync(stoppingToken);
                await ExpireSubscriptionsAsync(db, notifications, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Background job tick failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ProcessSyncJobsAsync(IApplicationDbContext db, IOdooClient odoo, ISender sender,
        INotificationService notifications, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var jobs = await db.OdooSyncJobs
            .Where(j => (j.Status == IntegrationStatus.Pending || j.Status == IntegrationStatus.Error)
                && j.Attempts < j.MaxAttempts
                && (j.NextAttemptAt == null || j.NextAttemptAt <= now))
            .OrderBy(j => j.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        foreach (var job in jobs)
        {
            job.Status = IntegrationStatus.Processing;
            await db.SaveChangesAsync(ct);
            try
            {
                await ProcessJobAsync(job, db, odoo, sender, notifications, ct);
                job.Status = IntegrationStatus.Done;
                job.ProcessedAt = DateTime.UtcNow;
                job.LastError = null;
                db.IntegrationLogs.Add(Log(job, IntegrationStatus.Done, null));
            }
            catch (OdooUnavailableException ex)
            {
                logger.LogDebug(ex, "Odoo sync job {Job} failed (attempt {Attempt})", job.JobType, job.Attempts + 1);
                job.Attempts++;
                job.LastError = ex.Message;
                job.NextAttemptAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, Math.Min(job.Attempts, 5)));
                job.Status = job.Attempts >= job.MaxAttempts ? IntegrationStatus.Error : IntegrationStatus.Pending;
                db.IntegrationLogs.Add(Log(job, IntegrationStatus.Error, ex.Message));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Sync job {Job} failed unexpectedly", job.JobType);
                job.Attempts++;
                job.LastError = ex.Message;
                job.NextAttemptAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, Math.Min(job.Attempts, 5)));
                job.Status = job.Attempts >= job.MaxAttempts ? IntegrationStatus.Error : IntegrationStatus.Pending;
                db.IntegrationLogs.Add(Log(job, IntegrationStatus.Error, ex.Message));
            }
            await db.SaveChangesAsync(ct);
        }
    }

    private async Task ProcessJobAsync(OdooSyncJob job, IApplicationDbContext db, IOdooClient odoo,
        ISender sender, INotificationService notifications, CancellationToken ct)
    {
        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(job.Payload) ? "{}" : job.Payload);
        var root = doc.RootElement;

        switch (job.JobType)
        {
            case SyncJobType.PartnerSync:
                await SyncPartnerAsync(root, db, odoo, ct);
                break;
            case SyncJobType.SubscriptionCreate:
                await CreateSubscriptionAsync(root, db, odoo, notifications, ct);
                break;
            case SyncJobType.LeadSync:
                await SyncLeadAsync(root, db, odoo, ct);
                break;
            case SyncJobType.MembershipPlanSync:
                await sender.Send(new SyncMembershipPlansCommand(), ct);
                break;
            default:
                logger.LogInformation("No background processor for job type {JobType}", job.JobType);
                break;
        }
    }

    private async Task SyncPartnerAsync(JsonElement payload, IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var customerId = payload.TryGetProperty("customerId", out var c) && c.TryGetGuid(out var cg) ? cg : Guid.Empty;
        if (customerId == Guid.Empty) return;

        var existingMapping = await db.OdooMappings.FirstOrDefaultAsync(
            m => m.EntityType == "Customer" && m.LocalId == customerId, ct);
        if (existingMapping is not null) return;

        var customer = await db.Customers.FirstAsync(c => c.Id == customerId, ct);
        var odooId = await odoo.CreatePartnerAsync(new Dictionary<string, object?>
        {
            ["name"] = customer.Name,
            ["mobile"] = customer.Phone,
            ["email"] = customer.Email ?? string.Empty,
            ["ref"] = customer.Id.ToString(), // idempotency key on the Odoo side
        }, ct);
        if (string.IsNullOrWhiteSpace(odooId))
            throw new OdooUnavailableException("Partner create returned no id.");

        customer.OdooPartnerId = odooId;
        db.OdooMappings.Add(new OdooMapping
        {
            EntityType = "Customer",
            LocalId = customer.Id,
            OdooId = odooId,
            OdooModel = "res.partner",
        });
        await db.SaveChangesAsync(ct);
    }

    private static async Task CreateSubscriptionAsync(JsonElement payload, IApplicationDbContext db, IOdooClient odoo,
        INotificationService notifications, CancellationToken ct)
    {
        var membershipId = payload.TryGetProperty("membershipId", out var m) && m.TryGetGuid(out var mg) ? mg : Guid.Empty;
        if (membershipId == Guid.Empty) return;
        var transactionId = payload.TryGetProperty("transactionId", out var t) ? t.GetString() : null;

        if (!await OdooSubscriptionSync.SyncAsync(membershipId, transactionId, db, odoo, ct)) return;

        var membership = await db.CustomerMemberships
            .Include(x => x.Customer).Include(x => x.MembershipPlan)
            .FirstAsync(x => x.Id == membershipId, ct);
        await notifications.NotifyAsync(membership.Customer.UserId, "membership.activated",
            "تم تفعيل عضويتك!", "Your membership is active!",
            membership.MembershipPlan.NameAr, membership.MembershipPlan.NameEn,
            Domain.NotificationChannel.InApp, new { membershipId = membership.Id }, ct);
    }

    private async Task SyncLeadAsync(JsonElement payload, IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var leadId = payload.TryGetProperty("leadId", out var l) && l.TryGetGuid(out var lg) ? lg : Guid.Empty;
        if (leadId == Guid.Empty) return;

        var lead = await db.Leads.FirstAsync(x => x.Id == leadId, ct);
        if (!string.IsNullOrWhiteSpace(lead.OdooLeadId)) return;

        var odooId = await odoo.CreateCrmLeadAsync(new Dictionary<string, object?>
        {
            ["external_reference"] = lead.Id.ToString(),
            ["name"] = $"{lead.Name} [motionpark:{lead.Id:N}]",
            ["lead_type"] = "membership_interest",
            ["mobile"] = lead.Phone ?? string.Empty,
            ["email"] = lead.Email ?? string.Empty,
            ["description"] = lead.Message ?? string.Empty,
        }, ct) ?? throw new OdooUnavailableException("CRM lead create returned no id.");

        lead.OdooLeadId = odooId;
        await db.SaveChangesAsync(ct);
    }

    private async Task ExpireSubscriptionsAsync(IApplicationDbContext db, INotificationService notifications, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var expiring = await db.CustomerMemberships
            .Include(m => m.Customer).Include(m => m.MembershipPlan)
            .Where(m => m.Status == SubscriptionStatus.Active && m.EndDate != null && m.EndDate < now)
            .Take(50)
            .ToListAsync(ct);
        foreach (var m in expiring)
        {
            m.Status = SubscriptionStatus.Expired;
            await notifications.NotifyAsync(m.Customer.UserId, "membership.expired",
                "انتهت عضويتك", "Your membership has expired",
                m.MembershipPlan.NameAr, m.MembershipPlan.NameEn,
                Domain.NotificationChannel.InApp, new { membershipId = m.Id }, ct);
        }
        if (expiring.Count > 0) await db.SaveChangesAsync(ct);
    }

    private static IntegrationLog Log(OdooSyncJob job, IntegrationStatus status, string? error) => new()
    {
        Direction = IntegrationDirection.Outbound,
        Entity = job.JobType.ToString(),
        Operation = "background_sync",
        LocalId = null,
        Status = status,
        Attempt = job.Attempts,
        Error = error,
        TransactionId = job.MotionParkTransactionId,
    };
}
