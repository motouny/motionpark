using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Payments;

namespace MotionPark.Infrastructure.Jobs;

/// <summary>
/// SubscriptionCreate job: creates the subscription in Odoo (motionpark.api.create_subscription),
/// then registers the platform payment against it (motionpark.payment.transaction.register_payment),
/// which marks the Odoo subscription paid and active. Both Odoo calls are idempotent on our ids, and
/// each step is recorded in OdooMappings, so a retry after a partial failure only does what is left.
/// </summary>
public static class OdooSubscriptionSync
{
    public const string MembershipEntity = "CustomerMembership";
    public const string PaymentEntity = "Payment";

    /// <returns>true when the membership became active on this run.</returns>
    public static async Task<bool> SyncAsync(Guid membershipId, string? transactionId,
        IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var membership = await db.CustomerMemberships
            .Include(x => x.Customer).Include(x => x.MembershipPlan)
            .FirstOrDefaultAsync(x => x.Id == membershipId, ct)
            ?? throw new InvalidOperationException("Membership not found for subscription sync job.");
        transactionId = string.IsNullOrWhiteSpace(transactionId) ? membership.Id.ToString() : transactionId;

        var mapping = await db.OdooMappings.FirstOrDefaultAsync(
            x => x.EntityType == MembershipEntity && x.LocalId == membership.Id, ct);
        var odooSubId = mapping?.OdooId ?? await CreateInOdooAsync(membership, transactionId, db, odoo, ct);

        await RegisterPaymentAsync(membership, odooSubId, transactionId, db, odoo, ct);

        var activated = membership.Status != SubscriptionStatus.Active;
        membership.Status = SubscriptionStatus.Active;
        await db.SaveChangesAsync(ct);
        return activated;
    }

    private static async Task<string> CreateInOdooAsync(CustomerMembership membership, string transactionId,
        IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var plan = membership.MembershipPlan;
        if (plan.OdooProductId is not { } productId)
            throw new InvalidOperationException($"Plan '{plan.Slug}' has no Odoo product; sync membership plans from Odoo first.");

        var customer = membership.Customer;
        var result = await odoo.CreateSubscriptionAsync(new Dictionary<string, object?>
        {
            ["external_reference"] = transactionId,
            ["product_id"] = productId,
            ["partner"] = new Dictionary<string, object?>
            {
                ["external_uuid"] = customer.Id.ToString(),
                ["name"] = customer.Name,
                ["email"] = customer.Email ?? string.Empty,
                ["mobile"] = customer.Phone,
                ["lang"] = "ar_SY",
            },
            ["billing_cycle"] = "once",
            ["auto_renew"] = membership.AutoRenew,
        }, ct) ?? throw new OdooUnavailableException("create_subscription returned no result.");

        if (result.TryGetValue("error", out var error) && error is not null)
            throw new InvalidOperationException($"Odoo rejected create_subscription: {error}");
        var odooSubId = result.TryGetValue("id", out var id) ? id?.ToString() : null;
        if (string.IsNullOrWhiteSpace(odooSubId))
            throw new OdooUnavailableException("create_subscription result carried no subscription id.");

        membership.OdooSubscriptionId = odooSubId;
        db.OdooMappings.Add(new OdooMapping
        {
            EntityType = MembershipEntity,
            LocalId = membership.Id,
            OdooId = odooSubId,
            OdooModel = "motionpark.subscription",
        });
        await db.SaveChangesAsync(ct); // record before the payment call so a retry never re-creates it
        return odooSubId;
    }

    private static async Task RegisterPaymentAsync(CustomerMembership membership, string odooSubId, string transactionId,
        IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.IdempotencyKey == transactionId
            && p.CustomerId == membership.CustomerId && p.Status == PaymentStatus.Success, ct);
        if (payment is null) return;
        if (await db.OdooMappings.AnyAsync(x => x.EntityType == PaymentEntity && x.LocalId == payment.Id, ct)) return;

        var transaction = await db.PaymentTransactions
            .Where(t => t.PaymentId == payment.Id && t.Status == PaymentStatus.Success)
            .FirstOrDefaultAsync(ct);

        var vals = new Dictionary<string, object?>
        {
            ["external_uuid"] = payment.Id.ToString(),
            ["subscription_id"] = int.Parse(odooSubId),
            ["amount"] = (double)payment.Amount,
            ["provider"] = transaction?.Provider ?? string.Empty,
            ["reference"] = transaction?.ProviderReference ?? string.Empty,
            ["status"] = "success",
        };
        if (int.TryParse(membership.Customer.OdooPartnerId, out var partnerId)) vals["partner_id"] = partnerId;

        var odooTxId = await odoo.RegisterPaymentAsync(vals, ct)
            ?? throw new OdooUnavailableException("register_payment returned no id.");
        db.OdooMappings.Add(new OdooMapping
        {
            EntityType = PaymentEntity,
            LocalId = payment.Id,
            OdooId = odooTxId,
            OdooModel = "motionpark.payment.transaction",
        });
        await db.SaveChangesAsync(ct);
    }
}
