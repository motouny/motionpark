using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MotionPark.Domain.Common;

namespace MotionPark.Domain.Catalog;

public class Branch : AuditableEntity
{
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Phone { get; set; }
    public string? Whatsapp { get; set; }
    public string? OperatingHours { get; set; }                 // jsonb
    public bool Active { get; set; } = true;
}

public class ActivityCategory : AuditableEntity
{
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
}

public class Activity : AuditableEntity
{
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public Guid? CategoryId { get; set; }
    public ActivityCategory? Category { get; set; }
    public string? ImageUrl { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
}

public class Coach : AuditableEntity
{
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? BioAr { get; set; }
    public string? BioEn { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Certifications { get; set; }                 // jsonb string[]
    public bool Active { get; set; } = true;

    public ICollection<CoachActivity> CoachActivities { get; set; } = new List<CoachActivity>();
    public ICollection<CoachBranch> CoachBranches { get; set; } = new List<CoachBranch>();
}

public class CoachActivity : Entity
{
    public Guid CoachId { get; set; }
    public Guid ActivityId { get; set; }
    public Coach Coach { get; set; } = null!;
    public Activity Activity { get; set; } = null!;
}

public class CoachBranch : Entity
{
    public Guid CoachId { get; set; }
    public Guid BranchId { get; set; }
    public Coach Coach { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}

/// <summary>A scheduled class instance on a given date. Capacity guarded by a concurrency token.</summary>
public class ClassSchedule : AuditableEntity
{
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
    public Guid? CoachId { get; set; }
    public Coach? Coach { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int Capacity { get; set; }
    public int BookedCount { get; set; }
    public int WaitingListCount { get; set; }
    public int? AgeMin { get; set; }
    public int? AgeMax { get; set; }
    public GenderScope GenderScope { get; set; } = GenderScope.Female;
    public bool Active { get; set; } = true;
    public bool Cancelled { get; set; }

    /// <summary>PG xmin-based concurrency token guarding BookedCount.</summary>
    [Timestamp]
    public uint RowVersion { get; set; }

    public ICollection<ScheduleMembershipPlan> SchedulePlans { get; set; } = new List<ScheduleMembershipPlan>();

    [NotMapped]
    public int SeatsLeft => Math.Max(0, Capacity - BookedCount);
}

public class ScheduleMembershipPlan : Entity
{
    public Guid ScheduleId { get; set; }
    public Guid MembershipPlanId { get; set; }
    public ClassSchedule Schedule { get; set; } = null!;
    public Membership.MembershipPlanReadModel MembershipPlan { get; set; } = null!;
}
