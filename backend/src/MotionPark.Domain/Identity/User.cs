using MotionPark.Domain.Common;

namespace MotionPark.Domain.Identity;

public class User : AuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string? NormalizedEmail { get; set; }
    public string Phone { get; set; } = string.Empty;          // canonical +966...
    public string Name { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "ar";
    public bool IsActive { get; set; } = true;
    public DateTime? LockoutEnd { get; set; }
    public int AccessFailedCount { get; set; }
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}

public class Role : Entity
{
    public string Name { get; set; } = string.Empty;           // SuperAdmin, ContentManager, ...
    public string? Description { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Permission> Permissions { get; set; } = new List<Permission>();
}

public class UserRole : Entity
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}

/// <summary>Named permission attached to a role (e.g. "bookings.manage").</summary>
public class Permission : Entity
{
    public Guid RoleId { get; set; }
    public string Key { get; set; } = string.Empty;
    public Role Role { get; set; } = null!;
}

public class RefreshToken : Entity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;      // SHA-256 of the opaque token
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public string CreatedByIp { get; set; } = string.Empty;
    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}

/// <summary>Single-use password reset token (hashed at rest).</summary>
public class PasswordResetToken : Entity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public bool IsUsable => UsedAt is null && DateTime.UtcNow < ExpiresAt;
}

public static class RoleNames
{
    public const string SuperAdmin = "SuperAdmin";
    public const string ContentManager = "ContentManager";
    public const string Marketing = "Marketing";
    public const string MembershipManager = "MembershipManager";
    public const string ScheduleManager = "ScheduleManager";
    public const string BranchManager = "BranchManager";
    public const string CustomerService = "CustomerService";
    public const string FinanceViewer = "FinanceViewer";

    public static readonly string[] All =
    [
        SuperAdmin, ContentManager, Marketing, MembershipManager,
        ScheduleManager, BranchManager, CustomerService, FinanceViewer
    ];
}
