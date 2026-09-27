using FluentValidation;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Dtos;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Bookings;

namespace MotionPark.Application.Bookings;

public record CreateBookingCommand(Guid UserId, Guid ScheduleId, string? IdempotencyKey) : IRequest<BookingDto>;
public record CancelBookingCommand(Guid UserId, Guid BookingId, string? Reason) : IRequest<BookingDto>;
public record GetMyBookingsQuery(Guid UserId, string? Status) : IRequest<IReadOnlyList<BookingDto>>;

public class CreateBookingValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingValidator() => RuleFor(x => x.ScheduleId).NotEmpty();
}

public sealed class CreateBookingHandler(
    IApplicationDbContext db,
    ILockProvider locks,
    INotificationService notifications,
    IValidator<CreateBookingCommand> validator)
    : IRequestHandler<CreateBookingCommand, BookingDto>
{
    public async Task<BookingDto> Handle(CreateBookingCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Booking failed validation.", validation.ToDictionary());

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");

        // Idempotent replay: same key returns the original booking.
        if (!string.IsNullOrWhiteSpace(cmd.IdempotencyKey))
        {
            var replay = await db.Bookings.Include(b => b.Schedule).ThenInclude(s => s.Branch)
                .Include(b => b.Schedule).ThenInclude(s => s.Activity)
                .Include(b => b.Schedule).ThenInclude(s => s.Coach)
                .FirstOrDefaultAsync(b => b.IdempotencyKey == cmd.IdempotencyKey && b.CustomerId == customer.Id, ct);
            if (replay is not null)
                return BookingMapper.ToDto(replay, await WaitingPositionAsync(replay, ct));
        }

        var schedule = await db.ClassSchedules
            .Include(s => s.SchedulePlans)
            .Include(s => s.Branch).Include(s => s.Activity).Include(s => s.Coach)
            .FirstOrDefaultAsync(s => s.Id == cmd.ScheduleId, ct)
            ?? throw new NotFoundException("SCHEDULE_NOT_FOUND", "Schedule not found.");

        if (!schedule.Active || schedule.Cancelled)
            throw new ConflictException("SCHEDULE_UNAVAILABLE", "This schedule is not open for booking.");
        if (schedule.Date < DateOnly.FromDateTime(DateTime.UtcNow.AddHours(3)))
            throw new ConflictException("SCHEDULE_PAST", "This schedule is in the past.");

        var now = DateTime.UtcNow;
        var membership = await db.CustomerMemberships
            .Include(m => m.MembershipPlan)
            .Where(m => m.CustomerId == customer.Id && m.Status == SubscriptionStatus.Active
                && m.StartDate <= now && (m.EndDate == null || m.EndDate >= now))
            .OrderByDescending(m => m.StartDate)
            .FirstOrDefaultAsync(ct)
            ?? throw new ConflictException("MEMBERSHIP_REQUIRED", "An active membership is required to book.");

        if (schedule.SchedulePlans.Count > 0 && schedule.SchedulePlans.All(p => p.MembershipPlanId != membership.MembershipPlanId))
            throw new ConflictException("PLAN_NOT_COVERED", "Your membership plan does not cover this schedule.");
        if (membership.RemainingSessions is <= 0)
            throw new ConflictException("SESSIONS_EXHAUSTED", "You have no remaining sessions this cycle.");

        var activeStatuses = new[] { BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.WaitingList };
        var duplicate = await db.Bookings.AnyAsync(b =>
            b.CustomerId == customer.Id && b.ScheduleId == schedule.Id && activeStatuses.Contains(b.Status), ct);
        if (duplicate)
            throw new ConflictException("DUPLICATE_BOOKING", "You already have a booking for this schedule.");

        var timeConflict = await db.Bookings
            .Include(b => b.Schedule)
            .AnyAsync(b => b.CustomerId == customer.Id && b.ScheduleId != schedule.Id
                && activeStatuses.Contains(b.Status)
                && b.Schedule.Date == schedule.Date
                && b.Schedule.StartTime < schedule.EndTime
                && b.Schedule.EndTime > schedule.StartTime, ct);
        if (timeConflict)
            throw new ConflictException("TIME_CONFLICT", "This booking overlaps another booking of yours.");

        // Distributed lock on the schedule guards the last seat against races.
        var handle = await locks.TryAcquireAsync($"booking:{schedule.Id}", TimeSpan.FromSeconds(20), ct)
            ?? throw new ConflictException("BOOKING_BUSY", "High demand on this schedule — please retry.");

        await using (handle)
        {
            const int maxAttempts = 2;
            for (var attempt = 0; attempt < maxAttempts; attempt++)
            {
                var seatsLeft = schedule.SeatsLeft;
                if (seatsLeft > 0)
                {
                    schedule.BookedCount++;
                    if (membership.RemainingSessions.HasValue)
                        membership.RemainingSessions--;
                    var booking = new Booking
                    {
                        CustomerId = customer.Id,
                        ScheduleId = schedule.Id,
                        Status = BookingStatus.Reserved,
                        IdempotencyKey = string.IsNullOrWhiteSpace(cmd.IdempotencyKey) ? null : cmd.IdempotencyKey,
                    };
                    db.Bookings.Add(booking);
                    try
                    {
                        await db.SaveChangesAsync(ct);
                        await notifications.NotifyAsync(customer.UserId, "booking.confirmed",
                            "تم تأكيد حجزك", "Booking confirmed",
                            schedule.Activity?.NameAr, schedule.Activity?.NameEn,
                            Domain.NotificationChannel.InApp, new { bookingId = booking.Id, scheduleId = schedule.Id }, ct);
                        return BookingMapper.ToDto(booking);
                    }
                    catch (DbUpdateConcurrencyException) when (attempt < maxAttempts - 1)
                    {
                        db.ChangeTracker.Clear();
                        schedule = await db.ClassSchedules.Include(s => s.SchedulePlans)
                            .FirstAsync(s => s.Id == schedule.Id, ct);
                        membership = await db.CustomerMemberships.FirstAsync(m => m.Id == membership.Id, ct);
                    }
                }
                else
                {
                    var nextPosition = (await db.WaitingListEntries
                        .Where(w => w.ScheduleId == schedule.Id && w.Status == WaitingListEntryStatus.Active)
                        .MaxAsync(w => (int?)w.Position, ct) ?? 0) + 1;
                    schedule.WaitingListCount++;
                    var entry = new WaitingListEntry
                    {
                        CustomerId = customer.Id,
                        ScheduleId = schedule.Id,
                        Position = nextPosition,
                        IdempotencyKey = string.IsNullOrWhiteSpace(cmd.IdempotencyKey) ? null : cmd.IdempotencyKey,
                    };
                    var booking = new Booking
                    {
                        CustomerId = customer.Id,
                        ScheduleId = schedule.Id,
                        Status = BookingStatus.WaitingList,
                        IdempotencyKey = entry.IdempotencyKey,
                    };
                    db.WaitingListEntries.Add(entry);
                    db.Bookings.Add(booking);
                    await db.SaveChangesAsync(ct);
                    await notifications.NotifyAsync(customer.UserId, "waitlist.joined",
                        "تمت إضافتك لقائمة الانتظار", "Added to the waiting list",
                        schedule.Activity?.NameAr, schedule.Activity?.NameEn,
                        Domain.NotificationChannel.InApp, new { scheduleId = schedule.Id, position = nextPosition }, ct);
                    return BookingMapper.ToDto(booking, nextPosition);
                }
            }
        }

        // Lost the race twice — land on the waiting list.
        var pos = (await db.WaitingListEntries
            .Where(w => w.ScheduleId == schedule.Id && w.Status == WaitingListEntryStatus.Active)
            .MaxAsync(w => (int?)w.Position, ct) ?? 0) + 1;
        schedule.WaitingListCount++;
        var wlEntry = new WaitingListEntry { CustomerId = customer.Id, ScheduleId = schedule.Id, Position = pos };
        var wlBooking = new Booking { CustomerId = customer.Id, ScheduleId = schedule.Id, Status = BookingStatus.WaitingList };
        db.WaitingListEntries.Add(wlEntry);
        db.Bookings.Add(wlBooking);
        await db.SaveChangesAsync(ct);
        return BookingMapper.ToDto(wlBooking, pos);
    }

    private async Task<int?> WaitingPositionAsync(Booking booking, CancellationToken ct)
    {
        if (booking.Status != BookingStatus.WaitingList) return null;
        return (await db.WaitingListEntries
            .Where(w => w.ScheduleId == booking.ScheduleId && w.CustomerId == booking.CustomerId
                && w.Status == WaitingListEntryStatus.Active)
            .Select(w => (int?)w.Position).FirstOrDefaultAsync(ct));
    }
}

public sealed class CancelBookingHandler(
    IApplicationDbContext db,
    ILockProvider locks,
    INotificationService notifications)
    : IRequestHandler<CancelBookingCommand, BookingDto>
{
    public async Task<BookingDto> Handle(CancelBookingCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");

        var booking = await db.Bookings
            .Include(b => b.Schedule).ThenInclude(s => s.Branch)
            .Include(b => b.Schedule).ThenInclude(s => s.Activity)
            .Include(b => b.Schedule).ThenInclude(s => s.Coach)
            .FirstOrDefaultAsync(b => b.Id == cmd.BookingId && b.CustomerId == customer.Id, ct)
            ?? throw new NotFoundException("BOOKING_NOT_FOUND", "Booking not found.");

        if (booking.Status == BookingStatus.Cancelled)
            return BookingMapper.ToDto(booking); // idempotent

        await BookingCancellation.CancelAsync(db, locks, notifications, booking, cmd.Reason, ct);

        await notifications.NotifyAsync(customer.UserId, "booking.cancelled",
            "تم إلغاء الحجز", "Booking cancelled",
            booking.Schedule.Activity?.NameAr, booking.Schedule.Activity?.NameEn,
            Domain.NotificationChannel.InApp, new { bookingId = booking.Id }, ct);
        return BookingMapper.ToDto(booking);
    }
}

public sealed class GetMyBookingsHandler(IApplicationDbContext db)
    : IRequestHandler<GetMyBookingsQuery, IReadOnlyList<BookingDto>>
{
    public async Task<IReadOnlyList<BookingDto>> Handle(GetMyBookingsQuery query, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == query.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");

        var bookings = db.Bookings.Where(b => b.CustomerId == customer.Id);
        if (!string.IsNullOrWhiteSpace(query.Status)
            && Enum.TryParse<BookingStatus>(query.Status, ignoreCase: true, out var status))
            bookings = bookings.Where(b => b.Status == status);

        var list = await bookings
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Schedule).ThenInclude(s => s.Branch)
            .Include(b => b.Schedule).ThenInclude(s => s.Activity)
            .Include(b => b.Schedule).ThenInclude(s => s.Coach)
            .ToListAsync(ct);

        var waitPositions = await db.WaitingListEntries
            .Where(w => w.CustomerId == customer.Id && w.Status == WaitingListEntryStatus.Active)
            .ToDictionaryAsync(w => w.ScheduleId, w => w.Position, ct);

        return list.Select(b => BookingMapper.ToDto(b,
            b.Status == BookingStatus.WaitingList && waitPositions.TryGetValue(b.ScheduleId, out var p) ? p : null
        )).ToList();
    }
}

/// <summary>
/// Cancels a booking under the schedule lock. A booked seat is freed (with its session restored and the
/// first waitlisted customer promoted into it); a waiting-list booking only leaves the waiting list.
/// </summary>
internal static class BookingCancellation
{
    public static async Task CancelAsync(IApplicationDbContext db, ILockProvider locks, INotificationService notifications,
        Booking booking, string? reason, CancellationToken ct)
    {
        if (booking.Status == BookingStatus.CheckedIn)
            throw new ConflictException("ALREADY_CHECKED_IN", "A checked-in booking cannot be cancelled.");

        var handle = await locks.TryAcquireAsync($"booking:{booking.ScheduleId}", TimeSpan.FromSeconds(20), ct)
            ?? throw new ConflictException("BOOKING_BUSY", "Please retry the cancellation.");
        await using (handle)
        {
            var wasWaiting = booking.Status == BookingStatus.WaitingList;
            booking.Status = BookingStatus.Cancelled;
            booking.CancelledAt = DateTime.UtcNow;
            booking.CancelReason = reason;
            var schedule = booking.Schedule;

            if (wasWaiting)
            {
                var own = await db.WaitingListEntries.FirstOrDefaultAsync(w => w.ScheduleId == schedule.Id
                    && w.CustomerId == booking.CustomerId && w.Status == WaitingListEntryStatus.Active, ct);
                if (own is not null) own.Status = WaitingListEntryStatus.Cancelled;
                schedule.WaitingListCount = Math.Max(0, schedule.WaitingListCount - 1);
                await db.SaveChangesAsync(ct);
                return;
            }

            schedule.BookedCount = Math.Max(0, schedule.BookedCount - 1);

            // Restore a session when the membership has a session cap.
            var membership = await db.CustomerMemberships
                .Include(m => m.MembershipPlan)
                .FirstOrDefaultAsync(m => m.CustomerId == booking.CustomerId
                    && m.Status == SubscriptionStatus.Active, ct);
            if (membership?.RemainingSessions is { } remaining && membership.MembershipPlan.SessionLimit > 0
                && remaining < membership.MembershipPlan.SessionLimit)
                membership.RemainingSessions = remaining + 1;

            // Promote the first waitlisted customer into the freed seat: their waiting-list booking becomes the seat.
            var entry = await db.WaitingListEntries
                .Where(w => w.ScheduleId == schedule.Id && w.Status == WaitingListEntryStatus.Active)
                .OrderBy(w => w.Position)
                .FirstOrDefaultAsync(ct);
            if (entry is not null)
            {
                entry.Status = WaitingListEntryStatus.Promoted;
                schedule.WaitingListCount = Math.Max(0, schedule.WaitingListCount - 1);
                var waiting = await db.Bookings.FirstOrDefaultAsync(b => b.ScheduleId == schedule.Id
                    && b.CustomerId == entry.CustomerId && b.Status == BookingStatus.WaitingList, ct);
                if (waiting is not null)
                    waiting.Status = BookingStatus.Reserved;
                else
                    db.Bookings.Add(new Booking { CustomerId = entry.CustomerId, ScheduleId = schedule.Id, Status = BookingStatus.Reserved });
                schedule.BookedCount++; // seat moves to the promoted customer
                var promotedCustomerUserId = await db.Customers
                    .Where(c => c.Id == entry.CustomerId)
                    .Select(c => (Guid?)c.UserId).FirstOrDefaultAsync(ct);
                await notifications.NotifyAsync(promotedCustomerUserId, "waitlist.promoted",
                    "تم ترقية حجزك", "You have been promoted from the waiting list",
                    schedule.Activity?.NameAr, schedule.Activity?.NameEn,
                    Domain.NotificationChannel.InApp, new { scheduleId = schedule.Id }, ct);
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
