using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Bookings;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Bookings;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class AdminBookingTests
{
    private static async Task<(MotionParkDbContext Db, Guid BookingId, Guid UserId)> BookedAsync(int capacity = 3)
    {
        var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customer, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: capacity);
        var booking = await new CreateBookingHandler(db, new FakeLockProvider(), new FakeNotificationService(), new CreateBookingValidator())
            .Handle(new CreateBookingCommand(userId, schedule.Id, null), CancellationToken.None);
        return (db, booking.Id, userId);
    }

    private static UpdateBookingStatusHandler Update(MotionParkDbContext db)
        => new(db, new FakeLockProvider(), new FakeNotificationService());

    [Fact]
    public async Task Staff_list_shows_member_schedule_and_allowed_statuses()
    {
        var (db, bookingId, _) = await BookedAsync();
        await using var _db = db;

        var list = await new GetAdminBookingsHandler(db).Handle(new GetAdminBookingsQuery(null, null, null, null), CancellationToken.None);

        var row = Assert.Single(list);
        Assert.Equal(bookingId, row.Id);
        Assert.Equal("Reserved", row.Status);
        Assert.False(string.IsNullOrEmpty(row.CustomerName));
        Assert.NotNull(row.Schedule);
        Assert.Contains("CheckedIn", row.AllowedStatuses);
    }

    [Fact]
    public async Task Check_in_stamps_the_time()
    {
        var (db, bookingId, _) = await BookedAsync();
        await using var _db = db;

        var result = await Update(db).Handle(new UpdateBookingStatusCommand(bookingId, "CheckedIn", null), CancellationToken.None);

        Assert.Equal("CheckedIn", result.Status);
        Assert.NotNull((await db.Bookings.SingleAsync()).CheckedInAt);
        Assert.Empty(result.AllowedStatuses);
    }

    [Fact]
    public async Task Staff_cancel_frees_the_seat()
    {
        var (db, bookingId, _) = await BookedAsync();
        await using var _db = db;

        await Update(db).Handle(new UpdateBookingStatusCommand(bookingId, "cancelled", null), CancellationToken.None);

        var booking = await db.Bookings.SingleAsync();
        Assert.Equal(BookingStatus.Cancelled, booking.Status);
        Assert.Equal("Cancelled by staff", booking.CancelReason);
        Assert.Equal(0, (await db.ClassSchedules.SingleAsync()).BookedCount);
    }

    [Fact]
    public async Task Moving_a_cancelled_booking_back_is_rejected()
    {
        var (db, bookingId, _) = await BookedAsync();
        await using var _db = db;
        await Update(db).Handle(new UpdateBookingStatusCommand(bookingId, "Cancelled", null), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Update(db).Handle(new UpdateBookingStatusCommand(bookingId, "Reserved", null), CancellationToken.None));
        Assert.Equal("INVALID_STATUS_TRANSITION", ex.Code);
    }

    [Fact]
    public async Task Unknown_status_is_a_validation_error()
    {
        var (db, bookingId, _) = await BookedAsync();
        await using var _db = db;

        await Assert.ThrowsAsync<ValidationAppException>(() =>
            Update(db).Handle(new UpdateBookingStatusCommand(bookingId, "Teleported", null), CancellationToken.None));
    }

    [Fact]
    public async Task Cancelling_a_waiting_list_booking_leaves_the_seats_alone()
    {
        await using var db = TestFactory.NewDbContext();
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var (customerA, userA) = await TestDataBuilder.CreateCustomerAsync(db, "0500000021");
        var (customerB, userB) = await TestDataBuilder.CreateCustomerAsync(db, "0500000022");
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerA, plan);
        await TestDataBuilder.CreateActiveMembershipAsync(db, customerB, plan);
        var schedule = await TestDataBuilder.CreateScheduleAsync(db, capacity: 1);
        var create = new CreateBookingHandler(db, new FakeLockProvider(), new FakeNotificationService(), new CreateBookingValidator());
        await create.Handle(new CreateBookingCommand(userA, schedule.Id, null), CancellationToken.None);
        var waiting = await create.Handle(new CreateBookingCommand(userB, schedule.Id, null), CancellationToken.None);

        await new CancelBookingHandler(db, new FakeLockProvider(), new FakeNotificationService())
            .Handle(new CancelBookingCommand(userB, waiting.Id, null), CancellationToken.None);

        var after = await db.ClassSchedules.SingleAsync();
        Assert.Equal(1, after.BookedCount); // customer A keeps the seat
        Assert.Equal(0, after.WaitingListCount);
        Assert.Equal(WaitingListEntryStatus.Cancelled, (await db.WaitingListEntries.SingleAsync()).Status);
        Assert.Equal(BookingStatus.Reserved, (await db.Bookings.SingleAsync(b => b.CustomerId == customerA.Id)).Status);
    }
}
