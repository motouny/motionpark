using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Memberships;
using MotionPark.Domain;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Settings;

namespace MotionPark.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
public class AdminIntegrationsController(
    IApplicationDbContext db,
    ISender sender,
    IOdooClient odoo) : ControllerBase
{
    // ---------- Odoo integration ----------

    [HttpGet("integrations/odoo")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetOdooStatus(CancellationToken ct)
    {
        var lastSuccess = await db.IntegrationLogs
            .Where(l => l.Status == IntegrationStatus.Done)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => (DateTime?)l.Timestamp)
            .FirstOrDefaultAsync(ct);
        var lastPlanSync = await db.IntegrationLogs
            .Where(l => l.Entity == "MembershipPlan" && l.Status == IntegrationStatus.Done)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => (DateTime?)l.Timestamp)
            .FirstOrDefaultAsync(ct);
        var lastCustomerSync = await db.IntegrationLogs
            .Where(l => l.Entity == "Customer" && l.Status == IntegrationStatus.Done)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => (DateTime?)l.Timestamp)
            .FirstOrDefaultAsync(ct);
        var failedJobs = await db.OdooSyncJobs.CountAsync(j => j.Status == IntegrationStatus.Error, ct);
        var pendingQueue = await db.OdooSyncJobs.CountAsync(j =>
            j.Status == IntegrationStatus.Pending || j.Status == IntegrationStatus.Processing, ct);

        var connected = await odoo.PingAsync(ct);
        return Ok(new
        {
            connected,
            lastSuccessAt = lastSuccess,
            lastPlanSyncAt = lastPlanSync,
            lastCustomerSyncAt = lastCustomerSync,
            failedJobs,
            pendingQueue,
        });
    }

    [HttpPost("integrations/odoo/test")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> TestConnection(CancellationToken ct)
    {
        var connected = await odoo.PingAsync(ct);
        if (!connected)
            return Ok(new { connected = false, message = "Odoo unreachable or authentication failed (integration is Degraded)." });
        return Ok(new { connected = true, message = "Odoo XML-RPC reachable and authenticated." });
    }

    [HttpPost("integrations/odoo/sync-plans")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> SyncPlans(CancellationToken ct)
    {
        // Runs inline; failures are recorded on the job and reported as 502 ODOO_UNAVAILABLE.
        var result = await sender.Send(new SyncMembershipPlansCommand(), ct);
        return Ok(new { success = true, result.Upserted, result.Deactivated });
    }

    [HttpPost("integrations/odoo/retry-failed")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RetryFailed(CancellationToken ct)
    {
        var failed = await db.OdooSyncJobs
            .Where(j => j.Status == IntegrationStatus.Error && j.Attempts < j.MaxAttempts)
            .ToListAsync(ct);
        foreach (var job in failed)
        {
            job.Status = IntegrationStatus.Pending;
            job.NextAttemptAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { requeued = failed.Count });
    }

    [HttpGet("integrations/odoo/logs")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetLogs([FromQuery] string? entity, [FromQuery] int take = 100)
    {
        var ct = HttpContext.RequestAborted;
        var query = db.IntegrationLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(l => l.Entity == entity);
        var logs = await query.OrderByDescending(l => l.Timestamp).Take(Math.Clamp(take, 1, 500))
            .Select(l => new
            {
                l.Id, direction = l.Direction.ToString(), l.Entity, l.Operation,
                l.LocalId, l.OdooId, status = l.Status.ToString(), l.Attempt, l.Error,
                l.TransactionId, l.Timestamp,
            })
            .ToListAsync(ct);
        return Ok(logs);
    }

    // ---------- System ----------

    [HttpGet("health")]
    [Authorize(Roles = "SuperAdmin,FinanceViewer")]
    public async Task<IActionResult> Health([FromServices] HealthCheckService healthCheckService, CancellationToken ct)
    {
        var report = await healthCheckService.CheckHealthAsync(ct);
        var lastSync = await db.IntegrationLogs
            .Where(l => l.Status == IntegrationStatus.Done)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => (DateTime?)l.Timestamp)
            .FirstOrDefaultAsync(ct);
        var failedJobs = await db.OdooSyncJobs.CountAsync(j => j.Status == IntegrationStatus.Error, ct);

        return Ok(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(e => e.Key,
                e => new { status = e.Value.Status.ToString(), e.Value.Description, exception = e.Value.Exception?.Message }),
            lastSyncAt = lastSync,
            failedJobs,
        });
    }

    [HttpGet("audit-logs")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAuditLogs([FromQuery] string? entity, [FromQuery] string? entityId,
        [FromQuery] int take = 200)
    {
        var ct = HttpContext.RequestAborted;
        var query = db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(entity)) query = query.Where(a => a.Entity == entity);
        if (!string.IsNullOrWhiteSpace(entityId)) query = query.Where(a => a.EntityId == entityId);
        var logs = await query.OrderByDescending(a => a.Timestamp).Take(Math.Clamp(take, 1, 500))
            .Select(a => new
            {
                a.Id, a.Entity, a.EntityId, a.Action, a.ActorUserId, a.ActorName, a.Changes, a.Timestamp,
            })
            .ToListAsync(ct);
        return Ok(logs);
    }

    [HttpGet("settings")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var settings = await db.SystemSettings.AsNoTracking().FirstAsync(ct);
        return Ok(new
        {
            settings.Id,
            languages = Json.ParseList<string>(settings.Languages),
            settings.DefaultLanguage, settings.Currency, settings.Timezone,
            settings.MaintenanceMode, settings.RegistrationOpen,
            features = Json.Parse<Dictionary<string, object?>>(settings.Features, new Dictionary<string, object?>()),
        });
    }

    [HttpPut("settings")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest req, CancellationToken ct)
    {
        var settings = await db.SystemSettings.FirstAsync(ct);
        if (req.Languages is not null) settings.Languages = Json.Stringify(req.Languages);
        if (req.DefaultLanguage is not null) settings.DefaultLanguage = req.DefaultLanguage;
        if (req.Currency is not null) settings.Currency = req.Currency;
        if (req.Timezone is not null) settings.Timezone = req.Timezone;
        if (req.MaintenanceMode.HasValue) settings.MaintenanceMode = req.MaintenanceMode.Value;
        if (req.RegistrationOpen.HasValue) settings.RegistrationOpen = req.RegistrationOpen.Value;
        if (req.Features is not null) settings.Features = Json.Stringify(req.Features);
        await db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    [HttpGet("roles")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var roles = await db.Roles
            .Include(r => r.Permissions)
            .OrderBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.Description, permissions = r.Permissions.Select(p => p.Key) })
            .ToListAsync(ct);
        return Ok(roles);
    }

    [HttpPut("roles/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest req, CancellationToken ct)
    {
        var role = await db.Roles.Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Role not found." } });
        if (role.Name == RoleNames.SuperAdmin)
            return BadRequest(new { error = new { code = "IMMUTABLE", message = "The SuperAdmin role cannot be modified." } });

        if (req.Description is not null) role.Description = req.Description;
        if (req.Permissions is not null)
        {
            db.Permissions.RemoveRange(role.Permissions);
            foreach (var key in req.Permissions.Distinct())
                db.Permissions.Add(new Permission { RoleId = role.Id, Key = key });
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { role.Id, role.Name, permissions = req.Permissions });
    }

    // ---------- Sync jobs inspector (used by the integrations UI) ----------

    [HttpGet("integrations/odoo/jobs")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetJobs([FromQuery] int take = 100)
    {
        var ct = HttpContext.RequestAborted;
        var jobs = await db.OdooSyncJobs.AsNoTracking()
            .OrderByDescending(j => j.CreatedAt)
            .Take(Math.Clamp(take, 1, 500))
            .Select(j => new
            {
                j.Id, type = j.JobType.ToString(), status = j.Status.ToString(),
                j.Attempts, j.MaxAttempts, j.NextAttemptAt, j.LastError,
                j.MotionParkTransactionId, j.CreatedAt, j.ProcessedAt,
            })
            .ToListAsync(ct);
        return Ok(jobs);
    }
}

public record UpdateSettingsRequest(List<string>? Languages, string? DefaultLanguage, string? Currency,
    string? Timezone, bool? MaintenanceMode, bool? RegistrationOpen, Dictionary<string, object?>? Features);
public record UpdateRoleRequest(string? Description, List<string>? Permissions);

[ApiController]
[Route("api/admin")]
public class AdminDashboardController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing,MembershipManager,ScheduleManager,BranchManager,CustomerService,FinanceViewer")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now.AddHours(3));
        return Ok(new
        {
            customers = await db.Customers.CountAsync(ct),
            activeMemberships = await db.CustomerMemberships.CountAsync(m => m.Status == SubscriptionStatus.Active, ct),
            pendingMemberships = await db.CustomerMemberships.CountAsync(m => m.Status == SubscriptionStatus.PendingPayment, ct),
            bookingsToday = await db.Bookings.CountAsync(b => b.Schedule.Date == today
                && b.Status != BookingStatus.Cancelled, ct),
            waitingList = await db.WaitingListEntries.CountAsync(w => w.Status == Domain.Bookings.WaitingListEntryStatus.Active, ct),
            leadsNew = await db.Leads.CountAsync(l => l.Status == LeadStatus.New, ct),
            schedulesUpcoming = await db.ClassSchedules.CountAsync(s => s.Date >= today && s.Active && !s.Cancelled, ct),
            mediaAssets = await db.MediaAssets.CountAsync(ct),
            failedSyncJobs = await db.OdooSyncJobs.CountAsync(j => j.Status == IntegrationStatus.Error, ct),
            pendingSyncJobs = await db.OdooSyncJobs.CountAsync(j => j.Status == IntegrationStatus.Pending, ct),
            generatedAt = now,
        });
    }
}
