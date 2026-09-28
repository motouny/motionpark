using MotionPark.Domain.Common;

namespace MotionPark.Domain.Payments;

public class Payment : AuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customers.Customer Customer { get; set; } = null!;
    public Guid? CustomerMembershipId { get; set; }
    public decimal Amount { get; set; }
    public decimal Vat { get; set; }
    public string Currency { get; set; } = "SAR";
    public PaymentStatus Status { get; set; } = PaymentStatus.Initiated;
    public string? PaymentMethod { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? OdooInvoiceId { get; set; }
}

public class PaymentTransaction : AuditableEntity
{
    public Guid? PaymentId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string Operation { get; set; } = "charge";
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public PaymentStatus Status { get; set; } = PaymentStatus.Initiated;
    public string? IdempotencyKey { get; set; }
    public string? ProviderReference { get; set; }            // non-secret reference only
    public string? FailureCode { get; set; }
    public string? FailureMessage { get; set; }
}
