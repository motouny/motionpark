using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Subscriptions;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Payments;
using Xunit;

using MotionPark.Application.Abstractions;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class SubscriptionIdempotencyTests
{
    private static CreateSubscriptionHandler Handler(
        MotionPark.Infrastructure.Persistence.MotionParkDbContext db,
        IPaymentProvider provider, FakeNotificationService? notifications = null)
        => new(db, new FakePaymentProviderFactory(provider), notifications ?? new FakeNotificationService(),
            new CreateSubscriptionValidator());

    [Fact]
    public async Task Unconfigured_provider_returns_402_payment_credentials_required()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);

        var ex = await Assert.ThrowsAsync<PaymentRequiredException>(() =>
            Handler(db, new FakePaymentProvider(configured: false)).Handle(
                new CreateSubscriptionCommand(userId, plan.Id, null, null, "key-1"), CancellationToken.None));

        Assert.Equal("PAYMENT_CREDENTIALS_REQUIRED", ex.Code);
        // No membership or successful payment may exist.
        Assert.Empty(await db.CustomerMemberships.ToListAsync());
        Assert.All(await db.PaymentTransactions.ToListAsync(), t => Assert.Equal(PaymentStatus.Failed, t.Status));
    }

    [Fact]
    public async Task Configured_provider_creates_membership_job_and_payment()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var provider = new FakePaymentProvider(configured: true);

        var dto = await Handler(db, provider).Handle(
            new CreateSubscriptionCommand(userId, plan.Id, null, "mada", "key-2"), CancellationToken.None);

        Assert.Equal("PendingPayment", dto.Status);
        Assert.Equal(1, provider.ChargeCount);
        Assert.Single(await db.CustomerMemberships.ToListAsync());
        Assert.Equal(PaymentStatus.Success, (await db.Payments.SingleAsync()).Status);
        Assert.Equal(SyncJobType.SubscriptionCreate, (await db.OdooSyncJobs.SingleAsync()).JobType);
    }

    [Fact]
    public async Task Same_idempotency_key_replays_the_original_subscription()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var provider = new FakePaymentProvider(configured: true);
        var key = Guid.NewGuid().ToString();

        var first = await Handler(db, provider).Handle(
            new CreateSubscriptionCommand(userId, plan.Id, null, null, key), CancellationToken.None);
        var replay = await Handler(db, provider).Handle(
            new CreateSubscriptionCommand(userId, plan.Id, null, null, key), CancellationToken.None);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(1, provider.ChargeCount); // no double charge
        Assert.Single(await db.CustomerMemberships.ToListAsync());
        Assert.Single(await db.OdooSyncJobs.ToListAsync());
    }

    [Fact]
    public async Task Failed_charge_marks_payment_failed_and_no_membership()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var provider = new FakePaymentProvider(configured: true, succeeds: false);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler(db, provider).Handle(
                new CreateSubscriptionCommand(userId, plan.Id, null, null, "key-3"), CancellationToken.None));

        Assert.Equal("PAYMENT_FAILED", ex.Code);
        Assert.Empty(await db.CustomerMemberships.ToListAsync());
        Assert.Equal(PaymentStatus.Failed, (await db.Payments.SingleAsync()).Status);
    }

    [Fact]
    public async Task Provider_payment_cannot_pay_for_two_subscriptions()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var provider = new FixedReferencePaymentProvider("pay_123");

        await Handler(db, provider).Handle(
            new CreateSubscriptionCommand(userId, plan.Id, null, "pay_123", "key-4"), CancellationToken.None);
        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            Handler(db, provider).Handle(
                new CreateSubscriptionCommand(userId, plan.Id, null, "pay_123", "key-5"), CancellationToken.None));

        Assert.Equal("PAYMENT_ALREADY_USED", ex.Code);
        Assert.Single(await db.CustomerMemberships.ToListAsync());
        Assert.Single(await db.Payments.ToListAsync());
    }

    private sealed class FixedReferencePaymentProvider(string reference) : IPaymentProvider
    {
        public string Name => "fixed";
        public bool IsConfigured => true;
        public Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default)
            => Task.FromResult(new PaymentChargeResult(true, reference, null, null, "paid"));
    }
}
