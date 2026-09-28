using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Subscriptions;

namespace MotionPark.Application.Payments;

/// <summary>Everything the browser needs to open the payment form for one plan. No secrets.</summary>
public record PaymentCheckoutDto(
    string Provider, string? PublishableKey, long Amount, string Currency, string Description,
    string? CallbackUrl, string IdempotencyKey, IReadOnlyDictionary<string, string> Metadata);

public record PrepareCheckoutQuery(Guid UserId, Guid MembershipPlanId) : IRequest<PaymentCheckoutDto>;

public sealed class PrepareCheckoutHandler(IApplicationDbContext db, IPaymentProviderFactory paymentFactory)
    : IRequestHandler<PrepareCheckoutQuery, PaymentCheckoutDto>
{
    public async Task<PaymentCheckoutDto> Handle(PrepareCheckoutQuery query, CancellationToken ct)
    {
        if (!paymentFactory.GetProvider().IsConfigured) throw new PaymentRequiredException();

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == query.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var plan = await db.MembershipPlanReadModels.FirstOrDefaultAsync(p => p.Id == query.MembershipPlanId && p.Active, ct)
            ?? throw new NotFoundException("PLAN_NOT_FOUND", "Membership plan not found.");

        var client = paymentFactory.GetClientConfig();
        var idempotencyKey = Guid.NewGuid().ToString();
        return new PaymentCheckoutDto(
            client.Provider, client.PublishableKey,
            Money.ToMinorUnits(plan.Price, plan.Currency), plan.Currency.ToUpperInvariant(),
            $"Motion Park - {plan.NameEn}", client.CallbackUrl, idempotencyKey,
            new Dictionary<string, string>
            {
                ["customer_id"] = customer.Id.ToString(),
                ["plan_id"] = plan.Id.ToString(),
                ["idempotency_key"] = idempotencyKey,
            });
    }
}

public enum PaidPaymentOutcome { Created, AlreadyProcessed, Ignored }

/// <summary>
/// A gateway reported a paid payment (webhook). Completes the subscription the customer started,
/// in case they closed the page before the browser called POST /api/subscriptions.
/// Reuses CreateSubscriptionHandler, so the payment is re-verified with the gateway and the
/// idempotency key makes it a no-op when the browser already completed it.
/// </summary>
public record ProcessPaidPaymentCommand(string PaymentId, IReadOnlyDictionary<string, string> Metadata)
    : IRequest<PaidPaymentOutcome>;

public sealed class ProcessPaidPaymentHandler(IApplicationDbContext db, ISender sender)
    : IRequestHandler<ProcessPaidPaymentCommand, PaidPaymentOutcome>
{
    public async Task<PaidPaymentOutcome> Handle(ProcessPaidPaymentCommand cmd, CancellationToken ct)
    {
        if (!Guid.TryParse(cmd.Metadata.GetValueOrDefault("customer_id"), out var customerId)
            || !Guid.TryParse(cmd.Metadata.GetValueOrDefault("plan_id"), out var planId)
            || string.IsNullOrWhiteSpace(cmd.Metadata.GetValueOrDefault("idempotency_key")))
            return PaidPaymentOutcome.Ignored; // not a membership checkout

        var idempotencyKey = cmd.Metadata["idempotency_key"];
        var userId = await db.Customers.Where(c => c.Id == customerId).Select(c => c.UserId).FirstOrDefaultAsync(ct);
        if (userId is null) return PaidPaymentOutcome.Ignored;

        if (await db.CustomerMemberships.AnyAsync(m => m.OdooSyncJobTransactionId == idempotencyKey, ct))
            return PaidPaymentOutcome.AlreadyProcessed;

        try
        {
            await sender.Send(new CreateSubscriptionCommand(userId.Value, planId, null, cmd.PaymentId, idempotencyKey), ct);
            return PaidPaymentOutcome.Created;
        }
        catch (ConflictException ex) when (ex.Code == "PAYMENT_ALREADY_USED")
        {
            return PaidPaymentOutcome.AlreadyProcessed;
        }
    }
}
