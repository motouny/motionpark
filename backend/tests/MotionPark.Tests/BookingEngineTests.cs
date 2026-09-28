using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Bookings;
using MotionPark.Application.Common;
using MotionPark.Domain.Bookings;

using Xunit;

using MotionPark.Application.Abstractions;
using MotionPark.Domain;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class BookingEngineTests
{
    private static CreateBookingHandler Handler(MotionParkDbContext db, FakeLockProvider? locks = null, FakeNotificationService? notifications = null)
        => new(db, locks ?? new FakeLockProvider(), notifications ?? new FakeNotificationService(), new CreateBookingValidator());

    private static CancelBookingHandler CancelHandler(MotionParkDbContext db, FakeNotificationService? notifications = null)
        => new(db, new FakeLockProvider(), notifications ?? new FakeNotificationService());

    [Fact]
    public async Task Booking_consumes_seats_until_full()
    {
        await using var db = TestFactory.NewDbContext();
        var (customerA, userA) = await TestDataBuilder.CreateCustomerAsync(db, "0500000021");
        var (customerB, userB) = await TestDataBuilder.CreateCustomerAsync(db, "0500000022");
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerA, plan);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerB, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 2);

        var first = await Handler(db).Handle(new CreateBookingCommand(userA, schedule.Id, null), CancellationToken.None);
        var second = await Handler(db).Handle(new CreateBookingCommand(userB, schedule.Id, null), CancellationToken.None);

        Assert.Equal(BookingStatus.Reserved.ToString(), first.Status);
        Assert.Equal(BookingStatus.Reserved.ToString(), second.Status);
        Assert.Equal(2, (await db.ClassSchedules.SingleAsync()).BookedCount);
    }

    [Fact]
    public async Task Full_schedule_waits_lists_the_customer()
    {
        await using var db = TestFactory.NewDbContext();
        var (customerA, userA) = await TestDataBuilder.CreateCustomerAsync(db, "0500000001");
        var (customerB, userB) = await TestDataBuilder.CreateCustomerAsync(db, "0500000002");
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerA, plan);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerB, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 1);

        await Handler(db).Handle(new CreateBookingCommand(userA, schedule.Id, null), CancellationToken.None);
        var waitlisted = await Handler(db).Handle(new CreateBookingCommand(userB, schedule.Id, null), CancellationToken.None);

        Assert.Equal(BookingStatus.WaitingList.ToString(), waitlisted.Status);
        Assert.Equal(1, waitlisted.WaitingListPosition);
        Assert.Equal(1, (await db.ClassSchedules.SingleAsync()).WaitingListCount);
    }

    [Fact]
    public async Task Duplicate_booking_same_schedule_is_rejected()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 5);

        await Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None));
        Assert.Equal("DUPLICATE_BOOKING", ex.Code);
        Assert.Equal(1, (await db.ClassSchedules.SingleAsync()).BookedCount);
    }

    [Fact]
    public async Task Overlapping_schedule_same_day_is_rejected()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var first = await TestDataBuilder.CreateScheduleAsync(db, date, new TimeOnly(10, 0), new TimeOnly(11, 0), 5);
        var overlapping = await TestDataBuilder.CreateScheduleAsync(db, date, new TimeOnly(10, 30), new TimeOnly(11, 30), 5);

        await Handler(db).Handle(new CreateBookingCommand(userId, first.Id, null), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler(db).Handle(new CreateBookingCommand(userId, overlapping.Id, null), CancellationToken.None));
        Assert.Equal("TIME_CONFLICT", ex.Code);
    }

    [Fact]
    public async Task Booking_without_membership_is_rejected()
    {
        await using var db = TestFactory.NewDbContext();
        var (_, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 5);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None));
        Assert.Equal("MEMBERSHIP_REQUIRED", ex.Code);
    }

    [Fact]
    public async Task Idempotency_key_replays_without_consuming_a_seat()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 2);
        var key = Guid.NewGuid().ToString();

        var first = await Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, key), CancellationToken.None);
        var replay = await Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, key), CancellationToken.None);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(1, (await db.ClassSchedules.SingleAsync()).BookedCount);
        Assert.Equal(1, await db.Bookings.CountAsync());
    }

    [Fact]
    public async Task Cancel_restores_capacity_and_promotes_waitlist()
    {
        await using var db = TestFactory.NewDbContext();
        var notifications = new FakeNotificationService();
        var (customerA, userA) = await TestDataBuilder.CreateCustomerAsync(db, "0500000011");
        var (customerB, userB) = await TestDataBuilder.CreateCustomerAsync(db, "0500000012");
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerA, plan);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerB, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 1);

        var bookingA = await Handler(db).Handle(new CreateBookingCommand(userA, schedule.Id, null), CancellationToken.None);
        await Handler(db, notifications: notifications).Handle(new CreateBookingCommand(userB, schedule.Id, null), CancellationToken.None);

        var cancelled = await CancelHandler(db, notifications).Handle(
            new CancelBookingCommand(userA, bookingA.Id, "test"), CancellationToken.None);
        Assert.Equal(BookingStatus.Cancelled.ToString(), cancelled.Status);

        var scheduleAfter = await db.ClassSchedules.SingleAsync();
        Assert.Equal(1, scheduleAfter.BookedCount); // seat transferred, not lost
        Assert.Equal(0, scheduleAfter.WaitingListCount);

        // The waiting-list booking itself becomes the seat; no second booking is left behind.
        var promoted = await db.Bookings.SingleAsync(b => b.CustomerId == customerB.Id);
        Assert.Equal(BookingStatus.Reserved, promoted.Status);
        Assert.Contains(notifications.Sent, n => n.Type == "waitlist.promoted");
    }

    [Fact]
    public async Task Cancel_is_idempotent()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 3);

        var booking = await Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None);
        await CancelHandler(db).Handle(new CancelBookingCommand(userId, booking.Id, null), CancellationToken.None);
        var again = await CancelHandler(db).Handle(new CancelBookingCommand(userId, booking.Id, null), CancellationToken.None);

        Assert.Equal(BookingStatus.Cancelled.ToString(), again.Status);
        Assert.Equal(0, (await db.ClassSchedules.SingleAsync()).BookedCount);
    }

    [Fact]
    public async Task Booking_decrements_remaining_sessions_when_capped()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db, sessionLimit: 5);
        var membership = await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 3);

        await Handler(db).Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None);
        Assert.Equal(4, (await db.CustomerMemberships.SingleAsync()).RemainingSessions);

        await CancelHandler(db).Handle(new CancelBookingCommand(userId,
            (await db.Bookings.SingleAsync()).Id, null), CancellationToken.None);
        Assert.Equal(5, (await db.CustomerMemberships.SingleAsync()).RemainingSessions);
    }
}
