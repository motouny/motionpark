using MotionPark.Domain.Common;

namespace MotionPark.Domain.Settings;

/// <summary>Singleton brand identity row (single row, fixed id).</summary>
public class BrandSettings : Entity
{
    public string? LogoPrimaryUrl { get; set; }
    public string? LogoDarkUrl { get; set; }
    public string? LogoLightUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string Colors { get; set; } = "{}";                // jsonb: primary/secondary/accent/background/foreground/...
    public string Gradients { get; set; } = "{}";             // jsonb: button/text/eyebrow
    public string Typography { get; set; } = "{}";            // jsonb: headingFont/bodyFont/...
    public string Contact { get; set; } = "{}";               // jsonb: phone/whatsapp/email/address/...
    public string SocialLinks { get; set; } = "{}";           // jsonb: instagram/twitter/...
}

/// <summary>Singleton system settings row (single row, fixed id).</summary>
public class SystemSettings : Entity
{
    public string Languages { get; set; } = "[\"ar\",\"en\"]";
    public string DefaultLanguage { get; set; } = "ar";
    public string Currency { get; set; } = "SAR";
    public string Timezone { get; set; } = "Asia/Riyadh";
    public bool MaintenanceMode { get; set; }
    public bool RegistrationOpen { get; set; } = true;
    public string Features { get; set; } = "{}";              // jsonb feature flags
}
