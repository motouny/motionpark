using MotionPark.Domain.Common;

namespace MotionPark.Domain.Membership;

/// <summary>
/// Denormalized read model of Odoo membership products. Odoo is the source of truth;
/// this table is what public endpoints serve. Seeds are marked source='seed'.
/// </summary>
public class MembershipPlanReadModel : AuditableEntity
{
    public int? OdooProductId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public decimal Price { get; set; }
    public decimal Vat { get; set; }
    public string Currency { get; set; } = "SAR";
    public int Duration { get; set; } = 1;
    public string DurationUnit { get; set; } = "month";
    public int SessionLimit { get; set; }                    // 0 = unlimited
    public string? FeaturesAr { get; set; }                   // jsonb string[]
    public string? FeaturesEn { get; set; }                   // jsonb string[]
    public string? Branches { get; set; }                     // jsonb [{id,nameAr,nameEn}]
    public string? Activities { get; set; }                   // jsonb [{id,nameAr,nameEn}]
    public bool Featured { get; set; }
    public int SortOrder { get; set; }
    public bool Active { get; set; } = true;
    public string Source { get; set; } = "seed";             // 'seed' | 'odoo'
    public bool IsConfigurablePlaceholder { get; set; }
}

public class CustomerMembership : AuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customers.Customer Customer { get; set; } = null!;
    public Guid MembershipPlanId { get; set; }
    public MembershipPlanReadModel MembershipPlan { get; set; } = null!;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Draft;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? NextBillingDate { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public int? RemainingSessions { get; set; }               // null = unlimited
    public bool AutoRenew { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Initiated;
    public string? OdooSubscriptionId { get; set; }
    public string? OdooSyncJobTransactionId { get; set; }     // idempotency link back to the sync job
    public string? QrTokenHash { get; set; }                  // SHA-256 of opaque QR token
    public DateTime? QrTokenRotatedAt { get; set; }
}
