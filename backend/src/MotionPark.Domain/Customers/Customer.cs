using MotionPark.Domain.Common;

namespace MotionPark.Domain.Customers;

public class Customer : AuditableEntity
{
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;          // canonical +966...
    public string? Email { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? OdooPartnerId { get; set; }
    public bool IsActive { get; set; } = true;
}
