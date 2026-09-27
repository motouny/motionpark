using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Catalog;

namespace MotionPark.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
public class AdminContentController(IApplicationDbContext db, IAuditLogger audit) : ControllerBase
{
    // ---------- Activities ----------

    [HttpGet("activities")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> GetActivities(CancellationToken ct)
        => Ok(await db.Activities.OrderBy(a => a.SortOrder).ToListAsync(ct));

    [HttpPost("activities")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> CreateActivity([FromBody] SaveActivityRequest req, CancellationToken ct)
    {
        var slug = (req.Slug ?? Slugify(req.NameEn ?? req.NameAr ?? "activity")).ToLowerInvariant();
        if (await db.Activities.AnyAsync(a => a.Slug == slug, ct))
            return Conflict(new { error = new { code = "SLUG_TAKEN", message = "An activity with this slug already exists." } });
        var activity = new Activity { Slug = slug };
        ApplyActivity(activity, req);
        db.Activities.Add(activity);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Activity", activity.Id.ToString(), "Created", req, ct);
        return Ok(activity);
    }

    [HttpPut("activities/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] SaveActivityRequest req, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (activity is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Activity not found." } });
        ApplyActivity(activity, req);
        activity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Activity", id.ToString(), "Updated", req, ct);
        return Ok(activity);
    }

    [HttpDelete("activities/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> DeleteActivity(Guid id, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (activity is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Activity not found." } });
        db.Activities.Remove(activity);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Activity", id.ToString(), "Deleted", new { activity.Slug }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyActivity(Activity a, SaveActivityRequest req)
    {
        a.NameAr = req.NameAr ?? a.NameAr;
        a.NameEn = req.NameEn ?? a.NameEn;
        a.DescriptionAr = req.DescriptionAr ?? a.DescriptionAr;
        a.DescriptionEn = req.DescriptionEn ?? a.DescriptionEn;
        a.CategoryId = req.CategoryId ?? a.CategoryId;
        a.ImageUrl = req.ImageUrl ?? a.ImageUrl;
        a.Icon = req.Icon ?? a.Icon;
        a.SortOrder = req.SortOrder ?? a.SortOrder;
        a.Active = req.Active ?? a.Active;
    }

    // ---------- Coaches ----------

    [HttpGet("coaches")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> GetCoaches(CancellationToken ct)
        => Ok(await db.Coaches.OrderBy(c => c.NameEn).ToListAsync(ct));

    [HttpPost("coaches")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> CreateCoach([FromBody] SaveCoachRequest req, CancellationToken ct)
    {
        var slug = (req.Slug ?? Slugify(req.NameEn ?? req.NameAr ?? "coach")).ToLowerInvariant();
        var coach = new Coach { Slug = slug };
        ApplyCoach(coach, req);
        db.Coaches.Add(coach);
        await SyncCoachLinksAsync(coach, req, ct);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Coach", coach.Id.ToString(), "Created", req, ct);
        return Ok(coach);
    }

    [HttpPut("coaches/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> UpdateCoach(Guid id, [FromBody] SaveCoachRequest req, CancellationToken ct)
    {
        var coach = await db.Coaches.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (coach is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Coach not found." } });
        ApplyCoach(coach, req);
        await SyncCoachLinksAsync(coach, req, ct);
        coach.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Coach", id.ToString(), "Updated", req, ct);
        return Ok(coach);
    }

    [HttpDelete("coaches/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> DeleteCoach(Guid id, CancellationToken ct)
    {
        var coach = await db.Coaches.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (coach is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Coach not found." } });
        db.Coaches.Remove(coach);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Coach", id.ToString(), "Deleted", new { coach.Slug }, ct);
        return Ok(new { success = true });
    }

    private async Task SyncCoachLinksAsync(Coach coach, SaveCoachRequest req, CancellationToken ct)
    {
        if (req.ActivityIds is not null)
        {
            var current = await db.CoachActivities.Where(x => x.CoachId == coach.Id).ToListAsync(ct);
            db.CoachActivities.RemoveRange(current);
            foreach (var activityId in req.ActivityIds.Distinct())
                db.CoachActivities.Add(new CoachActivity { CoachId = coach.Id, ActivityId = activityId });
        }
        if (req.BranchIds is not null)
        {
            var current = await db.CoachBranches.Where(x => x.CoachId == coach.Id).ToListAsync(ct);
            db.CoachBranches.RemoveRange(current);
            foreach (var branchId in req.BranchIds.Distinct())
                db.CoachBranches.Add(new CoachBranch { CoachId = coach.Id, BranchId = branchId });
        }
    }

    private static void ApplyCoach(Coach c, SaveCoachRequest req)
    {
        c.NameAr = req.NameAr ?? c.NameAr;
        c.NameEn = req.NameEn ?? c.NameEn;
        c.BioAr = req.BioAr ?? c.BioAr;
        c.BioEn = req.BioEn ?? c.BioEn;
        c.PhotoUrl = req.PhotoUrl ?? c.PhotoUrl;
        if (req.Certifications is not null) c.Certifications = Json.Stringify(req.Certifications);
        c.Active = req.Active ?? c.Active;
    }

    // ---------- Branches ----------

    [HttpGet("branches")]
    [Authorize(Roles = "SuperAdmin,BranchManager,ScheduleManager")]
    public async Task<IActionResult> GetBranches(CancellationToken ct)
        => Ok(await db.Branches.OrderBy(b => b.NameEn).ToListAsync(ct));

    [HttpPost("branches")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> CreateBranch([FromBody] SaveBranchRequest req, CancellationToken ct)
    {
        var slug = (req.Slug ?? Slugify(req.NameEn ?? req.NameAr ?? "branch")).ToLowerInvariant();
        var branch = new Branch { Slug = slug };
        ApplyBranch(branch, req);
        db.Branches.Add(branch);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Branch", branch.Id.ToString(), "Created", req, ct);
        return Ok(branch);
    }

    [HttpPut("branches/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> UpdateBranch(Guid id, [FromBody] SaveBranchRequest req, CancellationToken ct)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (branch is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Branch not found." } });
        ApplyBranch(branch, req);
        branch.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Branch", id.ToString(), "Updated", req, ct);
        return Ok(branch);
    }

    [HttpDelete("branches/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,BranchManager")]
    public async Task<IActionResult> DeleteBranch(Guid id, CancellationToken ct)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (branch is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Branch not found." } });
        db.Branches.Remove(branch);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Branch", id.ToString(), "Deleted", new { branch.Slug }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyBranch(Branch b, SaveBranchRequest req)
    {
        b.NameAr = req.NameAr ?? b.NameAr;
        b.NameEn = req.NameEn ?? b.NameEn;
        b.City = req.City ?? b.City;
        b.Address = req.Address ?? b.Address;
        b.Latitude = req.Latitude ?? b.Latitude;
        b.Longitude = req.Longitude ?? b.Longitude;
        b.Phone = req.Phone ?? b.Phone;
        b.Whatsapp = req.Whatsapp ?? b.Whatsapp;
        if (req.OperatingHours is not null) b.OperatingHours = Json.Stringify(req.OperatingHours);
        b.Active = req.Active ?? b.Active;
    }

    // ---------- Schedules ----------

    [HttpGet("schedules")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager,BranchManager")]
    public async Task<IActionResult> GetSchedules([FromQuery] Guid? branchId, [FromQuery] string? date, CancellationToken ct)
    {
        var query = db.ClassSchedules
            .Include(s => s.Branch).Include(s => s.Activity).Include(s => s.Coach)
            .Include(s => s.SchedulePlans)
            .AsQueryable();
        if (branchId.HasValue) query = query.Where(s => s.BranchId == branchId.Value);
        if (DateOnly.TryParse(date, out var d)) query = query.Where(s => s.Date == d);
        return Ok(await query.OrderBy(s => s.Date).ThenBy(s => s.StartTime).Take(500).ToListAsync(ct));
    }

    [HttpPost("schedules")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> CreateSchedule([FromBody] SaveScheduleRequest req, CancellationToken ct)
    {
        if (!DateOnly.TryParse(req.Date, out var date))
            return BadRequest(new { error = new { code = "INVALID_DATE", message = "Date must be yyyy-MM-dd." } });
        var schedule = new ClassSchedule
        {
            BranchId = req.BranchId,
            ActivityId = req.ActivityId,
            CoachId = req.CoachId,
            Date = date,
            StartTime = TimeOnly.Parse(req.StartTime),
            EndTime = TimeOnly.Parse(req.EndTime),
        };
        ApplySchedule(schedule, req);
        db.ClassSchedules.Add(schedule);
        await SyncSchedulePlansAsync(schedule, req.MembershipPlanIds, ct);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ClassSchedule", schedule.Id.ToString(), "Created", req, ct);
        return Ok(schedule);
    }

    [HttpPut("schedules/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> UpdateSchedule(Guid id, [FromBody] SaveScheduleRequest req, CancellationToken ct)
    {
        var schedule = await db.ClassSchedules.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (schedule is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Schedule not found." } });
        if (DateOnly.TryParse(req.Date, out var date)) schedule.Date = date;
        if (!string.IsNullOrWhiteSpace(req.StartTime)) schedule.StartTime = TimeOnly.Parse(req.StartTime);
        if (!string.IsNullOrWhiteSpace(req.EndTime)) schedule.EndTime = TimeOnly.Parse(req.EndTime);
        ApplySchedule(schedule, req);
        await SyncSchedulePlansAsync(schedule, req.MembershipPlanIds, ct);
        schedule.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ClassSchedule", id.ToString(), "Updated", req, ct);
        return Ok(schedule);
    }

    [HttpDelete("schedules/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ScheduleManager")]
    public async Task<IActionResult> DeleteSchedule(Guid id, CancellationToken ct)
    {
        var schedule = await db.ClassSchedules.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (schedule is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Schedule not found." } });
        schedule.Cancelled = true;
        schedule.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("ClassSchedule", id.ToString(), "Cancelled", new { schedule.Date, schedule.StartTime }, ct);
        return Ok(new { success = true });
    }

    private async Task SyncSchedulePlansAsync(ClassSchedule schedule, List<Guid>? planIds, CancellationToken ct)
    {
        if (planIds is null) return;
        var current = await db.ScheduleMembershipPlans.Where(x => x.ScheduleId == schedule.Id).ToListAsync(ct);
        db.ScheduleMembershipPlans.RemoveRange(current);
        foreach (var planId in planIds.Distinct())
            db.ScheduleMembershipPlans.Add(new ScheduleMembershipPlan { ScheduleId = schedule.Id, MembershipPlanId = planId });
    }

    private static void ApplySchedule(ClassSchedule s, SaveScheduleRequest req)
    {
        s.BranchId = req.BranchId == Guid.Empty ? s.BranchId : req.BranchId;
        s.ActivityId = req.ActivityId == Guid.Empty ? s.ActivityId : req.ActivityId;
        s.CoachId = req.CoachId ?? s.CoachId;
        s.Capacity = req.Capacity ?? s.Capacity;
        s.AgeMin = req.AgeMin ?? s.AgeMin;
        s.AgeMax = req.AgeMax ?? s.AgeMax;
        if (req.GenderScope is not null && Enum.TryParse<GenderScope>(req.GenderScope, ignoreCase: true, out var gs))
            s.GenderScope = gs;
        s.Active = req.Active ?? s.Active;
    }

    private static string Slugify(string value)
    {
        var chars = value.ToLowerInvariant().Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();
        var slug = new string(chars).Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}

public record SaveActivityRequest(string? Slug, string? NameAr, string? NameEn, string? DescriptionAr,
    string? DescriptionEn, Guid? CategoryId, string? ImageUrl, string? Icon, int? SortOrder, bool? Active);

public record SaveCoachRequest(string? Slug, string? NameAr, string? NameEn, string? BioAr, string? BioEn,
    string? PhotoUrl, List<string>? Certifications, bool? Active, List<Guid>? ActivityIds, List<Guid>? BranchIds);

public record SaveBranchRequest(string? Slug, string? NameAr, string? NameEn, string? City, string? Address,
    double? Latitude, double? Longitude, string? Phone, string? Whatsapp,
    Dictionary<string, object?>? OperatingHours, bool? Active);

public record SaveScheduleRequest(Guid BranchId, Guid ActivityId, Guid? CoachId, string Date,
    string StartTime, string EndTime, int? Capacity, int? AgeMin, int? AgeMax,
    string? GenderScope, bool? Active, List<Guid>? MembershipPlanIds);
