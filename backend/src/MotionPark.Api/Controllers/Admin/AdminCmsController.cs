using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain.Cms;
using MotionPark.Domain.Settings;

namespace MotionPark.Api.Controllers.Admin;

[ApiController]
[Route("api/admin")]
public class AdminCmsController(IApplicationDbContext db, IAuditLogger audit) : ControllerBase
{
    // ---------- Homepage sections ----------

    [HttpGet("homepage/sections")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> GetSections(CancellationToken ct)
    {
        var sections = await db.PageSections.OrderBy(s => s.SortOrder)
            .Select(s => new
            {
                s.Id, s.SectionKey, s.TitleAr, s.TitleEn,
                content = Json.Parse<Dictionary<string, object?>>(s.Content, new Dictionary<string, object?>()),
                s.SortOrder, s.IsEnabled, s.IsPublished,
            })
            .ToListAsync(ct);
        return Ok(sections);
    }

    [HttpPut("homepage/sections")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> UpdateSections([FromBody] List<UpdateSectionRequest> sections, CancellationToken ct)
    {
        foreach (var req in sections)
        {
            var section = await db.PageSections.FirstOrDefaultAsync(s => s.Id == req.Id, ct);
            if (section is null) continue;
            if (req.TitleAr is not null) section.TitleAr = req.TitleAr;
            if (req.TitleEn is not null) section.TitleEn = req.TitleEn;
            if (req.Content is not null) section.Content = Json.Stringify(req.Content);
            if (req.SortOrder.HasValue) section.SortOrder = req.SortOrder.Value;
            if (req.IsEnabled.HasValue) section.IsEnabled = req.IsEnabled.Value;
            if (req.IsPublished.HasValue)
            {
                section.IsPublished = req.IsPublished.Value;
                section.PublishedAt = req.IsPublished.Value ? DateTime.UtcNow : section.PublishedAt;
            }
            section.UpdatedAt = DateTime.UtcNow;
            await audit.LogAsync("PageSection", section.Id.ToString(), "Updated", req, ct);
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    // ---------- Brand settings (singleton) ----------

    [HttpGet("brand")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> GetBrand(CancellationToken ct)
    {
        var brand = await db.BrandSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (brand is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Brand settings not found." } });
        return Ok(new
        {
            brand.Id, brand.LogoPrimaryUrl, brand.LogoDarkUrl, brand.LogoLightUrl, brand.FaviconUrl,
            colors = Json.Parse<object>(brand.Colors, new object()),
            gradients = Json.Parse<object>(brand.Gradients, new object()),
            typography = Json.Parse<object>(brand.Typography, new object()),
            contact = Json.Parse<object>(brand.Contact, new object()),
            socialLinks = Json.Parse<object>(brand.SocialLinks, new object()),
        });
    }

    [HttpPut("brand")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> UpdateBrand([FromBody] UpdateBrandRequest req, CancellationToken ct)
    {
        var brand = await db.BrandSettings.FirstOrDefaultAsync(ct);
        if (brand is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Brand settings not found." } });

        if (req.LogoPrimaryUrl is not null) brand.LogoPrimaryUrl = req.LogoPrimaryUrl;
        if (req.LogoDarkUrl is not null) brand.LogoDarkUrl = req.LogoDarkUrl;
        if (req.LogoLightUrl is not null) brand.LogoLightUrl = req.LogoLightUrl;
        if (req.FaviconUrl is not null) brand.FaviconUrl = req.FaviconUrl;
        if (req.Colors is not null) brand.Colors = Json.Stringify(req.Colors);
        if (req.Gradients is not null) brand.Gradients = Json.Stringify(req.Gradients);
        if (req.Typography is not null) brand.Typography = Json.Stringify(req.Typography);
        if (req.Contact is not null) brand.Contact = Json.Stringify(req.Contact);
        if (req.SocialLinks is not null) brand.SocialLinks = Json.Stringify(req.SocialLinks);

        await db.SaveChangesAsync(ct);
        await audit.LogAsync("BrandSettings", brand.Id.ToString(), "Updated", req, ct);
        return Ok(new { success = true });
    }

    // ---------- Pages ----------

    [HttpGet("pages")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> GetPages(CancellationToken ct)
        => Ok(await db.Pages.OrderBy(p => p.Slug).ToListAsync(ct));

    [HttpPost("pages")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> CreatePage([FromBody] SavePageRequest req, CancellationToken ct)
    {
        var slug = req.Slug.Trim().ToLowerInvariant();
        if (await db.Pages.AnyAsync(p => p.Slug == slug, ct))
            return Conflict(new { error = new { code = "SLUG_TAKEN", message = "A page with this slug already exists." } });
        var page = new Page { Slug = slug };
        ApplyPage(page, req);
        db.Pages.Add(page);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Page", page.Id.ToString(), "Created", req, ct);
        return Ok(page);
    }

    [HttpPut("pages/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> UpdatePage(Guid id, [FromBody] SavePageRequest req, CancellationToken ct)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (page is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Page not found." } });
        ApplyPage(page, req);
        page.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Page", id.ToString(), "Updated", req, ct);
        return Ok(page);
    }

    [HttpDelete("pages/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager")]
    public async Task<IActionResult> DeletePage(Guid id, CancellationToken ct)
    {
        var page = await db.Pages.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (page is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Page not found." } });
        db.Pages.Remove(page);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Page", id.ToString(), "Deleted", new { page.Slug }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyPage(Page page, SavePageRequest req)
    {
        page.TitleAr = req.TitleAr ?? page.TitleAr;
        page.TitleEn = req.TitleEn ?? page.TitleEn;
        page.ContentAr = req.ContentAr ?? page.ContentAr;
        page.ContentEn = req.ContentEn ?? page.ContentEn;
        page.SeoTitle = req.SeoTitle ?? page.SeoTitle;
        page.SeoDescription = req.SeoDescription ?? page.SeoDescription;
        page.SeoKeywords = req.SeoKeywords ?? page.SeoKeywords;
        page.IsPublished = req.IsPublished ?? page.IsPublished;
    }

    // ---------- Banners ----------

    [HttpGet("banners")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> GetBanners(CancellationToken ct)
        => Ok(await db.Banners.OrderBy(b => b.SortOrder).ToListAsync(ct));

    [HttpPost("banners")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> CreateBanner([FromBody] SaveBannerRequest req, CancellationToken ct)
    {
        var banner = new Banner();
        ApplyBanner(banner, req);
        db.Banners.Add(banner);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Banner", banner.Id.ToString(), "Created", req, ct);
        return Ok(banner);
    }

    [HttpPut("banners/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> UpdateBanner(Guid id, [FromBody] SaveBannerRequest req, CancellationToken ct)
    {
        var banner = await db.Banners.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (banner is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Banner not found." } });
        ApplyBanner(banner, req);
        banner.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Banner", id.ToString(), "Updated", req, ct);
        return Ok(banner);
    }

    [HttpDelete("banners/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> DeleteBanner(Guid id, CancellationToken ct)
    {
        var banner = await db.Banners.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (banner is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Banner not found." } });
        db.Banners.Remove(banner);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Banner", id.ToString(), "Deleted", new { banner.TitleEn }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyBanner(Banner banner, SaveBannerRequest req)
    {
        banner.TitleAr = req.TitleAr ?? banner.TitleAr;
        banner.TitleEn = req.TitleEn ?? banner.TitleEn;
        banner.SubtitleAr = req.SubtitleAr ?? banner.SubtitleAr;
        banner.SubtitleEn = req.SubtitleEn ?? banner.SubtitleEn;
        banner.MediaAssetId = req.MediaAssetId ?? banner.MediaAssetId;
        banner.ImageUrl = req.ImageUrl ?? banner.ImageUrl;
        banner.LinkUrl = req.LinkUrl ?? banner.LinkUrl;
        banner.SortOrder = req.SortOrder ?? banner.SortOrder;
        banner.Active = req.Active ?? banner.Active;
        banner.StartsAt = req.StartsAt ?? banner.StartsAt;
        banner.EndsAt = req.EndsAt ?? banner.EndsAt;
    }

    // ---------- FAQs ----------

    [HttpGet("faqs")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> GetFaqs(CancellationToken ct)
        => Ok(await db.Faqs.OrderBy(f => f.SortOrder).ToListAsync(ct));

    [HttpPost("faqs")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> CreateFaq([FromBody] SaveFaqRequest req, CancellationToken ct)
    {
        var faq = new Faq();
        ApplyFaq(faq, req);
        db.Faqs.Add(faq);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Faq", faq.Id.ToString(), "Created", req, ct);
        return Ok(faq);
    }

    [HttpPut("faqs/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> UpdateFaq(Guid id, [FromBody] SaveFaqRequest req, CancellationToken ct)
    {
        var faq = await db.Faqs.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (faq is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "FAQ not found." } });
        ApplyFaq(faq, req);
        faq.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Faq", id.ToString(), "Updated", req, ct);
        return Ok(faq);
    }

    [HttpDelete("faqs/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> DeleteFaq(Guid id, CancellationToken ct)
    {
        var faq = await db.Faqs.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (faq is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "FAQ not found." } });
        db.Faqs.Remove(faq);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Faq", id.ToString(), "Deleted", new { faq.QuestionEn }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyFaq(Faq faq, SaveFaqRequest req)
    {
        faq.QuestionAr = req.QuestionAr ?? faq.QuestionAr;
        faq.QuestionEn = req.QuestionEn ?? faq.QuestionEn;
        faq.AnswerAr = req.AnswerAr ?? faq.AnswerAr;
        faq.AnswerEn = req.AnswerEn ?? faq.AnswerEn;
        faq.SortOrder = req.SortOrder ?? faq.SortOrder;
        faq.Active = req.Active ?? faq.Active;
    }

    // ---------- Testimonials ----------

    [HttpGet("testimonials")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> GetTestimonials(CancellationToken ct)
        => Ok(await db.Testimonials.OrderBy(t => t.CreatedAt).ToListAsync(ct));

    [HttpPost("testimonials")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> CreateTestimonial([FromBody] SaveTestimonialRequest req, CancellationToken ct)
    {
        var testimonial = new Testimonial();
        ApplyTestimonial(testimonial, req);
        db.Testimonials.Add(testimonial);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Testimonial", testimonial.Id.ToString(), "Created", req, ct);
        return Ok(testimonial);
    }

    [HttpPut("testimonials/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> UpdateTestimonial(Guid id, [FromBody] SaveTestimonialRequest req, CancellationToken ct)
    {
        var testimonial = await db.Testimonials.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (testimonial is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Testimonial not found." } });
        ApplyTestimonial(testimonial, req);
        testimonial.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Testimonial", id.ToString(), "Updated", req, ct);
        return Ok(testimonial);
    }

    [HttpDelete("testimonials/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
    public async Task<IActionResult> DeleteTestimonial(Guid id, CancellationToken ct)
    {
        var testimonial = await db.Testimonials.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (testimonial is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Testimonial not found." } });
        db.Testimonials.Remove(testimonial);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("Testimonial", id.ToString(), "Deleted", new { testimonial.Name }, ct);
        return Ok(new { success = true });
    }

    private static void ApplyTestimonial(Testimonial t, SaveTestimonialRequest req)
    {
        t.Name = req.Name ?? t.Name;
        t.RoleAr = req.RoleAr ?? t.RoleAr;
        t.RoleEn = req.RoleEn ?? t.RoleEn;
        t.TextAr = req.TextAr ?? t.TextAr;
        t.TextEn = req.TextEn ?? t.TextEn;
        t.Rating = req.Rating ?? t.Rating;
        t.Active = req.Active ?? t.Active;
    }
}

public record UpdateSectionRequest(Guid Id, string? TitleAr, string? TitleEn,
    Dictionary<string, object?>? Content, int? SortOrder, bool? IsEnabled, bool? IsPublished);

public record UpdateBrandRequest(string? LogoPrimaryUrl, string? LogoDarkUrl, string? LogoLightUrl,
    string? FaviconUrl, Dictionary<string, object?>? Colors, Dictionary<string, object?>? Gradients,
    Dictionary<string, object?>? Typography, Dictionary<string, object?>? Contact,
    Dictionary<string, object?>? SocialLinks);

public record SavePageRequest(string Slug, string? TitleAr, string? TitleEn, string? ContentAr,
    string? ContentEn, string? SeoTitle, string? SeoDescription, string? SeoKeywords, bool? IsPublished);

public record SaveBannerRequest(string? TitleAr, string? TitleEn, string? SubtitleAr, string? SubtitleEn,
    Guid? MediaAssetId, string? ImageUrl, string? LinkUrl, int? SortOrder, bool? Active,
    DateTime? StartsAt, DateTime? EndsAt);

public record SaveFaqRequest(string? QuestionAr, string? QuestionEn, string? AnswerAr,
    string? AnswerEn, int? SortOrder, bool? Active);

public record SaveTestimonialRequest(string? Name, string? RoleAr, string? RoleEn, string? TextAr,
    string? TextEn, int? Rating, bool? Active);
