using MotionPark.Domain.Common;

namespace MotionPark.Domain.Integrations;

/// <summary>Durable link between a local entity and its Odoo record.</summary>
public class OdooMapping : Entity
{
    public string EntityType { get; set; } = string.Empty;    // Customer, MembershipPlan, Subscription...
    public Guid LocalId { get; set; }
    public string OdooId { get; set; } = string.Empty;
    public string OdooModel { get; set; } = string.Empty;     // res.partner, product.template, ...
}

public class OdooSyncJob : AuditableEntity
{
    public SyncJobType JobType { get; set; }
    public string Payload { get; set; } = "{}";               // jsonb — NEVER contains secrets
    public IntegrationStatus Status { get; set; } = IntegrationStatus.Pending;
    public int Attempts { get; set; }
    public int MaxAttempts { get; set; } = 5;
    public DateTime? NextAttemptAt { get; set; }
    public string? LastError { get; set; }
    public string MotionParkTransactionId { get; set; } = string.Empty; // idempotency key
    public DateTime? ProcessedAt { get; set; }
}

public enum IntegrationDirection { Outbound, Inbound }

/// <summary>One attempt of one integration operation. No secrets ever.</summary>
public class IntegrationLog : Entity
{
    public IntegrationDirection Direction { get; set; }
    public string Entity { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
    public Guid? LocalId { get; set; }
    public string? OdooId { get; set; }
    public IntegrationStatus Status { get; set; }
    public int Attempt { get; set; }
    public string? Error { get; set; }
    public string? TransactionId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
