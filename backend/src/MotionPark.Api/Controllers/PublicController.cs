using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Common;
using MotionPark.Application.Dtos;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet("membership-plans")]
    public async Task<IActionResult> GetMembershipPlans(CancellationToken ct)
    {
        var plans = await db.MembershipPlanReadModels
            .Where(p => p.Active)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);
        return Ok(plans.Select(PlanMapper.ToDto));
    }

    [HttpGet("activities")]
    public async Task<IActionResult> GetActivities(CancellationToken ct)
    {
        var items = await db.Activities
            .Where(a => a.Active)
            .OrderBy(a => a.SortOrder)
            .Select(a => new
            {
                a.Id, a.Slug, a.NameAr, a.NameEn, a.DescriptionAr, a.DescriptionEn, a.ImageUrl, a.Icon, a.Active,
            })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpGet("activities/{slug}")]
    public async Task<IActionResult> GetActivity(string slug, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(a => a.Slug == slug && a.Active, ct);
        if (activity is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Activity not found." } });

        var coaches = await db.Coaches
            .Where(c => c.Active && c.CoachActivities.Any(ca => ca.ActivityId == activity.Id))
            .ToListAsync(ct);

        return Ok(new
        {
            activity.Id, activity.Slug, activity.NameAr, activity.NameEn,
            activity.DescriptionAr, activity.DescriptionEn, activity.ImageUrl, activity.Icon, activity.Active,
            coaches = coaches.Select(c => new
            {
                c.Id, c.Slug, c.NameAr, c.NameEn, c.BioAr, c.BioEn, c.PhotoUrl,
                certifications = Json.ParseList<string>(c.Certifications),
                c.Active,
            }),
        });
    }

    [HttpGet("coaches")]
    public async Task<IActionResult> GetCoaches(CancellationToken ct)
    {
        var coaches = await db.Coaches
            .Where(c => c.Active)
            .Include(c => c.CoachActivities).ThenInclude(ca => ca.Activity)
            .Include(c => c.CoachBranches).ThenInclude(cb => cb.Branch)
            .ToListAsync(ct);
        return Ok(coaches.Select(c => new
        {
            c.Id, c.Slug, c.NameAr, c.NameEn, c.BioAr, c.BioEn, c.PhotoUrl,
            certifications = Json.ParseList<string>(c.Certifications),
            activities = c.CoachActivities.Select(ca => new { ca.Activity.Id, ca.Activity.NameAr, ca.Activity.NameEn }),
            branches = c.CoachBranches.Select(cb => new { cb.Branch.Id, cb.Branch.NameAr, cb.Branch.NameEn }),
            c.Active,
        }));
    }

    [HttpGet("coaches/{slug}")]
    public async Task<IActionResult> GetCoach(string slug, CancellationToken ct)
    {
        var coach = await db.Coaches
            .Where(c => c.Active)
            .Include(c => c.CoachActivities).ThenInclude(ca => ca.Activity)
            .Include(c => c.CoachBranches).ThenInclude(cb => cb.Branch)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);
        if (coach is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Coach not found." } });
        return Ok(new
        {
            coach.Id, coach.Slug, coach.NameAr, coach.NameEn, coach.BioAr, coach.BioEn, coach.PhotoUrl,
            certifications = Json.ParseList<string>(coach.Certifications),
            activities = coach.CoachActivities.Select(ca => new { ca.Activity.Id, ca.Activity.NameAr, ca.Activity.NameEn }),
            branches = coach.CoachBranches.Select(cb => new { cb.Branch.Id, cb.Branch.NameAr, cb.Branch.NameEn }),
            coach.Active,
        });
    }

    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches(CancellationToken ct)
    {
        var branches = await db.Branches
            .Where(b => b.Active)
            .OrderBy(b => b.NameEn)
            .ToListAsync(ct);
        return Ok(branches.Select(b => new
        {
            b.Id, b.Slug, b.NameAr, b.NameEn, b.City, b.Address, b.Latitude, b.Longitude,
            b.Phone, b.Whatsapp,
            operatingHours = Json.Parse<object>(b.OperatingHours, new object()),
            b.Active,
        }));
    }

    [HttpGet("branches/{slug}")]
    public async Task<IActionResult> GetBranch(string slug, CancellationToken ct)
    {
        var branch = await db.Branches.FirstOrDefaultAsync(b => b.Slug == slug && b.Active, ct);
        if (branch is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Branch not found." } });
        return Ok(new
        {
            branch.Id, branch.Slug, branch.NameAr, branch.NameEn, branch.City, branch.Address,
            branch.Latitude, branch.Longitude, branch.Phone, branch.Whatsapp,
            operatingHours = Json.Parse<object>(branch.OperatingHours, new object()),
            branch.Active,
        });
    }

    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule([FromQuery] Guid? branchId, [FromQuery] string? date, CancellationToken ct)
    {
        var query = db.ClassSchedules
            .Include(s => s.SchedulePlans)
            .Include(s => s.Branch).Include(s => s.Activity).Include(s => s.Coach)
            .Where(s => s.Active && !s.Cancelled);
        if (branchId.HasValue) query = query.Where(s => s.BranchId == branchId.Value);
        if (DateOnly.TryParse(date, out var d)) query = query.Where(s => s.Date == d);
        else query = query.Where(s => s.Date >= DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3)));

        var schedules = await query.OrderBy(s => s.Date).ThenBy(s => s.StartTime).Take(500).ToListAsync(ct);
        return Ok(schedules.Select(ScheduleMapper.ToDto));
    }

    [HttpGet("pages/{slug}")]
    public async Task<IActionResult> GetPage(string slug, CancellationToken ct)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished, ct);
        if (page is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Page not found." } });
        return Ok(new
        {
            page.Slug, page.TitleAr, page.TitleEn, page.ContentAr, page.ContentEn,
            seo = new { page.SeoTitle, page.SeoDescription, page.SeoKeywords },
        });
    }

    [HttpGet("faqs")]
    public async Task<IActionResult> GetFaqs(CancellationToken ct)
    {
        var faqs = await db.Faqs.Where(f => f.Active).OrderBy(f => f.SortOrder)
            .Select(f => new { f.Id, f.QuestionAr, f.QuestionEn, f.AnswerAr, f.AnswerEn, f.SortOrder })
            .ToListAsync(ct);
        return Ok(faqs);
    }

    [HttpGet("testimonials")]
    public async Task<IActionResult> GetTestimonials(CancellationToken ct)
    {
        var items = await db.Testimonials.Where(t => t.Active)
            .OrderBy(t => t.CreatedAt)
            .Select(t => new { t.Id, t.Name, t.RoleAr, t.RoleEn, t.TextAr, t.TextEn, t.Rating, t.Active })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpGet("banners")]
    public async Task<IActionResult> GetBanners(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var banners = await db.Banners
            .Where(b => b.Active && (b.StartsAt == null || b.StartsAt <= now) && (b.EndsAt == null || b.EndsAt >= now))
            .OrderBy(b => b.SortOrder)
            .ToListAsync(ct);
        return Ok(banners.Select(b => new
        {
            b.Id, b.TitleAr, b.TitleEn, b.SubtitleAr, b.SubtitleEn,
            imageUrl = b.ImageUrl ?? (b.MediaAssetId.HasValue ? $"/api/media/{b.MediaAssetId}/file" : null),
            b.LinkUrl, b.SortOrder,
        }));
    }

    [HttpGet("homepage")]
    public async Task<IActionResult> GetHomepage(CancellationToken ct)
    {
        var sections = await db.PageSections
            .Where(s => s.IsEnabled && s.IsPublished)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);
        var brand = await db.BrandSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        var settings = await db.SystemSettings.AsNoTracking().FirstOrDefaultAsync(ct);

        return Ok(new
        {
            sections = sections.Select(s => new
            {
                s.Id, key = s.SectionKey, s.TitleAr, s.TitleEn,
                content = Json.Parse<Dictionary<string, object?>>(s.Content, new Dictionary<string, object?>()),
                s.SortOrder,
            }),
            brand = brand is null ? null : new
            {
                brand.LogoPrimaryUrl, brand.LogoDarkUrl, brand.LogoLightUrl, brand.FaviconUrl,
                colors = Json.Parse<object>(brand.Colors, new object()),
                gradients = Json.Parse<object>(brand.Gradients, new object()),
                typography = Json.Parse<object>(brand.Typography, new object()),
                contact = Json.Parse<object>(brand.Contact, new object()),
                socialLinks = Json.Parse<object>(brand.SocialLinks, new object()),
            },
            settings = settings is null ? null : new
            {
                languages = Json.ParseList<string>(settings.Languages),
                settings.DefaultLanguage, settings.Currency, settings.Timezone,
            },
        });
    }
}
