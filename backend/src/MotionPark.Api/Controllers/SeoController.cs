using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Common;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("/")]
public class SeoController(IApplicationDbContext db, IConfiguration config) : ControllerBase
{
    [HttpGet("sitemap.xml")]
    public async Task<IActionResult> Sitemap(CancellationToken ct)
    {
        var baseUrl = (config["APP_URL"] ?? "https://motion-park.com").TrimEnd('/');
        var pages = await db.Pages.Where(p => p.IsPublished).Select(p => p.Slug).ToListAsync(ct);
        var activities = await db.Activities.Where(a => a.Active).Select(a => a.Slug).ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("""<?xml version="1.0" encoding="UTF-8"?>""");
        sb.AppendLine("""<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">""");
        void Url(string loc, string? priority = null)
        {
            sb.AppendLine("  <url>");
            sb.AppendLine($"    <loc>{System.Security.SecurityElement.Escape(loc)}</loc>");
            if (priority is not null) sb.AppendLine($"    <priority>{priority}</priority>");
            sb.AppendLine("  </url>");
        }

        Url(baseUrl, "1.0");
        Url($"{baseUrl}/memberships", "0.9");
        Url($"{baseUrl}/schedule", "0.8");
        foreach (var slug in pages) Url($"{baseUrl}/pages/{slug}", "0.7");
        foreach (var slug in activities) Url($"{baseUrl}/activities/{slug}", "0.8");
        sb.AppendLine("</urlset>");

        return Content(sb.ToString(), "application/xml", Encoding.UTF8);
    }

    [HttpGet("robots.txt")]
    public ContentResult Robots()
    {
        var baseUrl = (config["APP_URL"] ?? "https://motion-park.com").TrimEnd('/');
        return Content($"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nSitemap: {baseUrl}/sitemap.xml\n",
            "text/plain", Encoding.UTF8);
    }
}
