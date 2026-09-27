using MotionPark.Domain.Common;

namespace MotionPark.Domain.Cms;

public class Page : AuditableEntity
{
    public string Slug { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? ContentAr { get; set; }
    public string? ContentEn { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? SeoKeywords { get; set; }
    public bool IsPublished { get; set; }
}

/// <summary>Homepage CMS section (hero, activities, story, membership, cta, footer...).</summary>
public class PageSection : AuditableEntity
{
    public string SectionKey { get; set; } = string.Empty;    // hero, activities, schedule, story, membership, cta, footer...
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Content { get; set; } = "{}";               // jsonb CMS payload
    public int SortOrder { get; set; }
    public bool IsEnabled { get; set; } = true;
    public bool IsPublished { get; set; } = true;
    public DateTime? PublishedAt { get; set; }
}

public class Banner : AuditableEntity
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? SubtitleAr { get; set; }
    public string? SubtitleEn { get; set; }
    public Guid? MediaAssetId { get; set; }
    public string? ImageUrl { get; set; }
    public string? LinkUrl { get; set; }
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
}

public class MediaAsset : AuditableEntity
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }
    public string Path { get; set; } = string.Empty;          // absolute path on disk
    public string? AltAr { get; set; }
    public string? AltEn { get; set; }
    public string? Title { get; set; }
    public MediaCategory Category { get; set; } = MediaCategory.General;
    public Guid? UploadedByUserId { get; set; }
}

public class Faq : AuditableEntity
{
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
}

public class Testimonial : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? RoleAr { get; set; }
    public string? RoleEn { get; set; }
    public string TextAr { get; set; } = string.Empty;
    public string TextEn { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public bool Active { get; set; } = true;
}

public class Lead : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public LeadType Type { get; set; } = LeadType.Contact;
    public Guid? BranchId { get; set; }
    public Guid? ActivityId { get; set; }
    public Guid? MembershipPlanId { get; set; }
    public string? Message { get; set; }
    public string? UtmSource { get; set; }
    public string? UtmCampaign { get; set; }
    public string? UtmMedium { get; set; }
    public LeadStatus Status { get; set; } = LeadStatus.New;
    public string? OdooLeadId { get; set; }
}
