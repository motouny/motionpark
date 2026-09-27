using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Payments;
using MotionPark.Application.Subscriptions;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class PaymentCheckoutTests
{
    private sealed class ConfiguredFactory(IPaymentProvider provider) : IPaymentProviderFactory
    {
        public IPaymentProvider GetProvider() => provider;
        public PaymentClientConfig GetClientConfig() => new("moyasar", "pk_test_abc", "https://motion-park.com/account/payments/callback");
    }

    /// <summary>Routes CreateSubscriptionCommand to the real handler, as the dispatcher does.</summary>
    private sealed class SubscriptionSender(MotionParkDbContext db, IPaymentProvider provider) : ISender
    {
        public int Calls { get; private set; }
        public async Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken ct = default)
        {
            Calls++;
            var handler = new CreateSubscriptionHandler(db, new FakePaymentProviderFactory(provider),
                new FakeNotificationService(), new CreateSubscriptionValidator());
            return (TResponse)(object)await handler.Handle((CreateSubscriptionCommand)(object)request, ct);
        }
    }

    [Fact]
    public async Task Checkout_returns_halalas_publishable_key_and_binding_metadata()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);

        var dto = await new PrepareCheckoutHandler(db, new ConfiguredFactory(new FakePaymentProvider(configured: true)))
            .Handle(new PrepareCheckoutQuery(userId, plan.Id), CancellationToken.None);

        Assert.Equal("moyasar", dto.Provider);
        Assert.Equal("pk_test_abc", dto.PublishableKey);
        Assert.Equal(49900, dto.Amount);
        Assert.Equal("SAR", dto.Currency);
        Assert.Equal(customer.Id.ToString(), dto.Metadata["customer_id"]);
        Assert.Equal(plan.Id.ToString(), dto.Metadata["plan_id"]);
        Assert.Equal(dto.IdempotencyKey, dto.Metadata["idempotency_key"]);
    }

    [Fact]
    public async Task Checkout_without_provider_is_402()
    {
        await using var db = TestFactory.NewDbContext();
        var (_, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);

        await Assert.ThrowsAsync<PaymentRequiredException>(() =>
            new PrepareCheckoutHandler(db, new FakePaymentProviderFactory(new FakePaymentProvider(configured: false)))
                .Handle(new PrepareCheckoutQuery(userId, plan.Id), CancellationToken.None));
    }

    [Fact]
    public async Task Webhook_completes_a_subscription_the_customer_left_before_returning()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, _) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        var sender = new SubscriptionSender(db, new FakePaymentProvider(configured: true));
        var handler = new ProcessPaidPaymentHandler(db, sender);
        var metadata = Metadata(customer.Id, plan.Id, "key-w1");

        var first = await handler.Handle(new ProcessPaidPaymentCommand("pay_1", metadata), CancellationToken.None);
        var retry = await handler.Handle(new ProcessPaidPaymentCommand("pay_1", metadata), CancellationToken.None);

        Assert.Equal(PaidPaymentOutcome.Created, first);
        Assert.Equal(PaidPaymentOutcome.AlreadyProcessed, retry);
        Assert.Equal(1, sender.Calls);
        var membership = await db.CustomerMemberships.SingleAsync();
        Assert.Equal("key-w1", membership.OdooSyncJobTransactionId);
    }

    [Fact]
    public async Task Webhook_ignores_payments_that_are_not_membership_checkouts()
    {
        await using var db = TestFactory.NewDbContext();
        var sender = new SubscriptionSender(db, new FakePaymentProvider(configured: true));

        var outcome = await new ProcessPaidPaymentHandler(db, sender).Handle(
            new ProcessPaidPaymentCommand("pay_2", new Dictionary<string, string> { ["order"] = "x" }), CancellationToken.None);

        Assert.Equal(PaidPaymentOutcome.Ignored, outcome);
        Assert.Equal(0, sender.Calls);
    }

    private static Dictionary<string, string> Metadata(Guid customerId, Guid planId, string key) => new()
    {
        ["customer_id"] = customerId.ToString(),
        ["plan_id"] = planId.ToString(),
        ["idempotency_key"] = key,
    };
}
