using MotionPark.Domain.Common;

namespace MotionPark.Domain.Bookings;

public class Booking : AuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customers.Customer Customer { get; set; } = null!;
    public Guid ScheduleId { get; set; }
    public Catalog.ClassSchedule Schedule { get; set; } = null!;
    public BookingStatus Status { get; set; } = BookingStatus.Reserved;
    public string? IdempotencyKey { get; set; }
    public string? CancelReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime? CheckedInAt { get; set; }
}

public enum WaitingListEntryStatus { Active, Promoted, Cancelled }

public class WaitingListEntry : AuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customers.Customer Customer { get; set; } = null!;
    public Guid ScheduleId { get; set; }
    public Catalog.ClassSchedule Schedule { get; set; } = null!;
    public int Position { get; set; }
    public WaitingListEntryStatus Status { get; set; } = WaitingListEntryStatus.Active;
    public string? IdempotencyKey { get; set; }
}
