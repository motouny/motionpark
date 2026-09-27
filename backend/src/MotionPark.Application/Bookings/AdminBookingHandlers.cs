using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Dtos;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Bookings;

namespace MotionPark.Application.Bookings;

public record AdminBookingDto(
    Guid Id, Guid ScheduleId, string Status, DateTime CreatedAt, DateTime? CancelledAt, DateTime? CheckedInAt,
    ScheduleDto Schedule, Guid CustomerId, string CustomerName, string CustomerPhone, IReadOnlyList<string> AllowedStatuses);

public record GetAdminBookingsQuery(string? Status, DateOnly? From, DateOnly? To, Guid? BranchId)
    : IRequest<IReadOnlyList<AdminBookingDto>>;

public record UpdateBookingStatusCommand(Guid BookingId, string Status, string? Reason) : IRequest<AdminBookingDto>;

/// <summary>Staff status changes. Seats and the waiting list only move through booking or cancelling.</summary>
public static class BookingStatusRules
{
    public static IReadOnlyList<string> AllowedFrom(BookingStatus current) => (current switch
    {
        BookingStatus.Reserved => [BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.NoShow, BookingStatus.Cancelled],
        BookingStatus.Confirmed => [BookingStatus.CheckedIn, BookingStatus.NoShow, BookingStatus.Cancelled],
        BookingStatus.NoShow => [BookingStatus.CheckedIn], // correct a mistaken no-show
        BookingStatus.WaitingList => [BookingStatus.Cancelled],
        _ => Array.Empty<BookingStatus>(),
    }).Select(s => s.ToString()).ToList();
}

public sealed class GetAdminBookingsHandler(IApplicationDbContext db)
    : IRequestHandler<GetAdminBookingsQuery, IReadOnlyList<AdminBookingDto>>
{
    public async Task<IReadOnlyList<AdminBookingDto>> Handle(GetAdminBookingsQuery query, CancellationToken ct)
    {
        var bookings = db.Bookings.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Status)
            && Enum.TryParse<BookingStatus>(query.Status, ignoreCase: true, out var status))
            bookings = bookings.Where(b => b.Status == status);
        if (query.From is { } from) bookings = bookings.Where(b => b.Schedule.Date >= from);
        if (query.To is { } to) bookings = bookings.Where(b => b.Schedule.Date <= to);
        if (query.BranchId is { } branchId) bookings = bookings.Where(b => b.Schedule.BranchId == branchId);

        var list = await bookings
            .Include(b => b.Customer)
            .Include(b => b.Schedule).ThenInclude(s => s.Branch)
            .Include(b => b.Schedule).ThenInclude(s => s.Activity)
            .Include(b => b.Schedule).ThenInclude(s => s.Coach)
            .OrderByDescending(b => b.Schedule.Date).ThenByDescending(b => b.Schedule.StartTime)
            .ThenByDescending(b => b.CreatedAt)
            .Take(500)
            .ToListAsync(ct);
        return list.Select(AdminBookingMapper.ToDto).ToList();
    }
}

public sealed class UpdateBookingStatusHandler(
    IApplicationDbContext db,
    ILockProvider locks,
    INotificationService notifications)
    : IRequestHandler<UpdateBookingStatusCommand, AdminBookingDto>
{
    public async Task<AdminBookingDto> Handle(UpdateBookingStatusCommand cmd, CancellationToken ct)
    {
        if (!Enum.TryParse<BookingStatus>(cmd.Status, ignoreCase: true, out var target))
            throw new ValidationAppException("Unknown booking status.",
                new Dictionary<string, string[]> { ["status"] = [$"'{cmd.Status}' is not a booking status."] });

        var booking = await db.Bookings
            .Include(b => b.Customer)
            .Include(b => b.Schedule).ThenInclude(s => s.Branch)
            .Include(b => b.Schedule).ThenInclude(s => s.Activity)
            .Include(b => b.Schedule).ThenInclude(s => s.Coach)
            .FirstOrDefaultAsync(b => b.Id == cmd.BookingId, ct)
            ?? throw new NotFoundException("BOOKING_NOT_FOUND", "Booking not found.");

        if (booking.Status == target) return AdminBookingMapper.ToDto(booking); // idempotent
        if (!BookingStatusRules.AllowedFrom(booking.Status).Contains(target.ToString()))
            throw new ConflictException("INVALID_STATUS_TRANSITION",
                $"A {booking.Status} booking cannot be changed to {target}.");

        if (target == BookingStatus.Cancelled)
        {
            await BookingCancellation.CancelAsync(db, locks, notifications, booking, cmd.Reason ?? "Cancelled by staff", ct);
            await notifications.NotifyAsync(booking.Customer.UserId, "booking.cancelled",
                "تم إلغاء الحجز", "Booking cancelled",
                booking.Schedule.Activity?.NameAr, booking.Schedule.Activity?.NameEn,
                NotificationChannel.InApp, new { bookingId = booking.Id }, ct);
            return AdminBookingMapper.ToDto(booking);
        }

        booking.Status = target;
        if (target == BookingStatus.CheckedIn) booking.CheckedInAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return AdminBookingMapper.ToDto(booking);
    }
}

internal static class AdminBookingMapper
{
    public static AdminBookingDto ToDto(Booking b) => new(
        b.Id, b.ScheduleId, b.Status.ToString(), b.CreatedAt, b.CancelledAt, b.CheckedInAt,
        ScheduleMapper.ToDto(b.Schedule), b.CustomerId, b.Customer?.Name ?? string.Empty, b.Customer?.Phone ?? string.Empty,
        BookingStatusRules.AllowedFrom(b.Status));
}
