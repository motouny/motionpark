using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Cms;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
[Authorize(Roles = "SuperAdmin,ContentManager,Marketing")]
public class AdminMediaController(IApplicationDbContext db, IConfiguration config, IAuditLogger audit) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
        "application/pdf", "video/mp4",
    };

    private static readonly Dictionary<string, string> ExtensionByContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = ".png", ["image/jpeg"] = ".jpg", ["image/webp"] = ".webp",
        ["image/gif"] = ".gif", ["image/svg+xml"] = ".svg",
        ["application/pdf"] = ".pdf", ["video/mp4"] = ".mp4",
    };

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string? category, CancellationToken ct)
    {
        var query = db.MediaAssets.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(m => (m.Title ?? "").Contains(search) || (m.AltEn ?? "").Contains(search)
                || (m.AltAr ?? "").Contains(search) || m.FileName.Contains(search));
        if (Enum.TryParse<MediaCategory>(category, ignoreCase: true, out var cat))
            query = query.Where(m => m.Category == cat);

        var items = await query.OrderByDescending(m => m.CreatedAt).Take(500)
            .Select(m => new
            {
                m.Id, m.FileName, m.ContentType, m.Size, m.AltAr, m.AltEn, m.Title,
                category = m.Category.ToString(),
                url = $"/api/media/{m.Id}/file",
                m.CreatedAt,
            })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    [RequestSizeLimit(200 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFileCollection files, CancellationToken ct)
    {
        if (files.Count == 0)
            return BadRequest(new { error = new { code = "NO_FILES", message = "No files uploaded." } });

        var storageRoot = config["MEDIA_STORAGE_PATH"] ?? "/var/www/motionpark/storage/media";
        var maxMb = int.TryParse(config["MEDIA_MAX_MB"], out var mb) ? mb : 10;
        var maxBytes = (long)maxMb * 1024 * 1024;
        var uploaded = new List<object>();

        foreach (var file in files)
        {
            if (!AllowedContentTypes.Contains(file.ContentType))
                return BadRequest(new { error = new { code = "INVALID_CONTENT_TYPE", message = $"{file.ContentType} is not an allowed media type." } });
            if (file.Length > maxBytes)
                return BadRequest(new { error = new { code = "FILE_TOO_LARGE", message = $"{file.FileName} exceeds the {maxMb}MB limit." } });

            var extension = ExtensionByContentType[file.ContentType];
            var now = DateTime.UtcNow;
            var relativeDir = Path.Combine(now.ToString("yyyy"), now.ToString("MM"));
            var absoluteDir = Path.Combine(storageRoot, relativeDir);
            Directory.CreateDirectory(absoluteDir);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var absolutePath = Path.Combine(absoluteDir, fileName);
            await using (var stream = System.IO.File.Create(absolutePath))
            {
                await file.CopyToAsync(stream, ct);
            }

            var asset = new MediaAsset
            {
                FileName = file.FileName,
                ContentType = file.ContentType,
                Size = file.Length,
                Path = absolutePath,
                Category = MediaCategory.General,
            };
            db.MediaAssets.Add(asset);
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("MediaAsset", asset.Id.ToString(), "Created",
                new { asset.FileName, asset.ContentType, asset.Size }, ct);

            uploaded.Add(new
            {
                asset.Id, asset.FileName, asset.ContentType, asset.Size, asset.AltAr, asset.AltEn, asset.Title,
                category = asset.Category.ToString(),
                url = $"/api/media/{asset.Id}/file",
            });
        }

        return Ok(uploaded);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMediaRequest request, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (asset is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Media asset not found." } });

        var changes = new Dictionary<string, object?>();
        if (request.AltAr is not null) { changes["AltAr"] = new { old = asset.AltAr, @new = request.AltAr }; asset.AltAr = request.AltAr; }
        if (request.AltEn is not null) { changes["AltEn"] = new { old = asset.AltEn, @new = request.AltEn }; asset.AltEn = request.AltEn; }
        if (request.Title is not null) { changes["Title"] = new { old = asset.Title, @new = request.Title }; asset.Title = request.Title; }
        if (request.Category is not null && Enum.TryParse<MediaCategory>(request.Category, ignoreCase: true, out var cat))
        {
            changes["Category"] = new { old = asset.Category.ToString(), @new = cat.ToString() };
            asset.Category = cat;
        }
        asset.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("MediaAsset", id.ToString(), "Updated", changes, ct);
        return Ok(new { asset.Id, asset.FileName, asset.AltAr, asset.AltEn, asset.Title, category = asset.Category.ToString() });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (asset is null) return NotFound(new { error = new { code = "NOT_FOUND", message = "Media asset not found." } });

        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(ct);
        try { if (System.IO.File.Exists(asset.Path)) System.IO.File.Delete(asset.Path); }
        catch (IOException) { /* file may be locked; metadata is already removed */ }
        await audit.LogAsync("MediaAsset", id.ToString(), "Deleted", new { asset.FileName }, ct);
        return Ok(new { success = true });
    }
}

public record UpdateMediaRequest(string? AltAr, string? AltEn, string? Title, string? Category);

[ApiController]
[Route("api/media")]
public class MediaFileController(IApplicationDbContext db, IConfiguration config) : ControllerBase
{
    /// <summary>
    /// Authorized file serving: returns X-Accel-Redirect for Nginx when MEDIA_X_ACCEL_PREFIX is set,
    /// otherwise streams the file directly.
    /// </summary>
    [HttpGet("{id:guid}/file")]
    [Authorize]
    public async Task<IActionResult> GetFile(Guid id, CancellationToken ct)
    {
        var asset = await db.MediaAssets.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id, ct);
        if (asset is null || !System.IO.File.Exists(asset.Path))
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Media not found." } });

        var accelPrefix = config["MEDIA_X_ACCEL_PREFIX"];
        if (!string.IsNullOrWhiteSpace(accelPrefix))
        {
            var storageRoot = Path.GetFullPath(config["MEDIA_STORAGE_PATH"] ?? "/var/www/motionpark/storage/media");
            var fullPath = Path.GetFullPath(asset.Path);
            if (fullPath.StartsWith(storageRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            {
                var relative = fullPath[(storageRoot.Length + 1)..].Replace(Path.DirectorySeparatorChar, '/');
                Response.Headers["X-Accel-Redirect"] = $"{accelPrefix.TrimEnd('/')}/{relative}";
                Response.Headers["Content-Type"] = asset.ContentType;
                return Ok();
            }
        }

        var stream = new FileStream(asset.Path, FileMode.Open, FileAccess.Read, FileShare.Read);
        return File(stream, asset.ContentType, asset.FileName);
    }
}
