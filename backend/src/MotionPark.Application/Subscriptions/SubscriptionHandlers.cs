using FluentValidation;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Dtos;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Payments;

namespace MotionPark.Application.Subscriptions;

public record SubscriptionDto(
    Guid Id, MembershipPlanDto Plan, string Status,
    DateTime? StartDate, DateTime? EndDate, DateTime? NextBillingDate,
    string BillingCycle, int? RemainingSessions, bool AutoRenew, string PaymentStatus);

public record CreateSubscriptionCommand(
    Guid UserId, Guid MembershipPlanId, Guid? BranchId, string? PaymentMethodId, string? IdempotencyKey)
    : IRequest<SubscriptionDto>;

public record GetSubscriptionQuery(Guid UserId) : IRequest<SubscriptionDto?>;
public record CancelSubscriptionCommand(Guid UserId, Guid SubscriptionId, string? Reason) : IRequest<SubscriptionDto>;
public record RenewSubscriptionCommand(Guid UserId, Guid SubscriptionId, string? PaymentMethodId = null) : IRequest<SubscriptionDto>;

public class CreateSubscriptionValidator : AbstractValidator<CreateSubscriptionCommand>
{
    public CreateSubscriptionValidator() => RuleFor(x => x.MembershipPlanId).NotEmpty();
}

internal static class PaymentReplayGuard
{
    /// <summary>A provider payment (e.g. a Moyasar payment id sent by the browser) may pay for one order only.</summary>
    public static async Task EnsureNotReusedAsync(IApplicationDbContext db, string providerName, PaymentChargeResult charge, CancellationToken ct)
    {
        if (!charge.Success || string.IsNullOrEmpty(charge.ProviderReference)) return;
        var used = await db.PaymentTransactions.AnyAsync(t => t.Provider == providerName
            && t.ProviderReference == charge.ProviderReference && t.Status == PaymentStatus.Success, ct);
        if (used) throw new ConflictException("PAYMENT_ALREADY_USED", "This payment has already been used.");
    }
}

public static class SubscriptionMapper
{
    public static SubscriptionDto ToDto(CustomerMembership m) => new(
        m.Id, PlanMapper.ToDto(m.MembershipPlan), m.Status.ToString(),
        m.StartDate, m.EndDate, m.NextBillingDate, m.BillingCycle.ToString(),
        m.RemainingSessions, m.AutoRenew, m.PaymentStatus.ToString());
}

public sealed class CreateSubscriptionHandler(
    IApplicationDbContext db,
    IPaymentProviderFactory paymentFactory,
    INotificationService notifications,
    IValidator<CreateSubscriptionCommand> validator)
    : IRequestHandler<CreateSubscriptionCommand, SubscriptionDto>
{
    public async Task<SubscriptionDto> Handle(CreateSubscriptionCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Subscription failed validation.", validation.ToDictionary());

        var idempotencyKey = string.IsNullOrWhiteSpace(cmd.IdempotencyKey) ? Guid.NewGuid().ToString() : cmd.IdempotencyKey!;

        // Idempotency: a replayed key returns the original subscription.
        var existingJob = await db.OdooSyncJobs
            .FirstOrDefaultAsync(j => j.JobType == SyncJobType.SubscriptionCreate
                && j.MotionParkTransactionId == idempotencyKey, ct);
        if (existingJob is not null)
        {
            var existing = await db.CustomerMemberships.Include(m => m.MembershipPlan)
                .FirstOrDefaultAsync(m => m.OdooSyncJobTransactionId == idempotencyKey, ct);
            if (existing is not null) return SubscriptionMapper.ToDto(existing);
        }

        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var plan = await db.MembershipPlanReadModels.FirstOrDefaultAsync(p => p.Id == cmd.MembershipPlanId && p.Active, ct)
            ?? throw new NotFoundException("PLAN_NOT_FOUND", "Membership plan not found.");

        var provider = paymentFactory.GetProvider();
        if (!provider.IsConfigured)
        {
            // Never fake success: surface 402 PAYMENT_CREDENTIALS_REQUIRED.
            db.PaymentTransactions.Add(new PaymentTransaction
            {
                Provider = provider.Name,
                Amount = plan.Price,
                Currency = plan.Currency,
                Status = PaymentStatus.Failed,
                IdempotencyKey = idempotencyKey,
                FailureCode = "PAYMENT_CREDENTIALS_REQUIRED",
                FailureMessage = "Payment provider is not configured.",
            });
            await db.SaveChangesAsync(ct);
            throw new PaymentRequiredException();
        }

        var charge = await provider.ChargeAsync(new PaymentChargeRequest(
            plan.Price, plan.Currency, customer.Id, idempotencyKey, cmd.PaymentMethodId,
            new Dictionary<string, string> { ["planId"] = plan.Id.ToString(), ["planSlug"] = plan.Slug }), ct);
        await PaymentReplayGuard.EnsureNotReusedAsync(db, provider.Name, charge, ct);

        var payment = new Payment
        {
            CustomerId = customer.Id,
            Amount = plan.Price,
            Vat = Math.Round(plan.Price * plan.Vat / 100m, 2),
            Currency = plan.Currency,
            Status = charge.Success ? PaymentStatus.Success : PaymentStatus.Failed,
            PaymentMethod = cmd.PaymentMethodId,
            IdempotencyKey = idempotencyKey,
        };
        db.Payments.Add(payment);
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            PaymentId = payment.Id,
            Provider = provider.Name,
            Amount = plan.Price,
            Currency = plan.Currency,
            Status = payment.Status,
            IdempotencyKey = idempotencyKey,
            ProviderReference = charge.ProviderReference,
            FailureCode = charge.FailureCode,
            FailureMessage = charge.FailureMessage,
        });

        if (!charge.Success)
        {
            await db.SaveChangesAsync(ct);
            await notifications.NotifyAsync(cmd.UserId, "payment.failed",
                "فشلت عملية الدفع", "Payment failed",
                charge.FailureMessage, charge.FailureMessage,
                Domain.NotificationChannel.InApp, new { planId = plan.Id }, ct);
            throw new ConflictException("PAYMENT_FAILED", charge.FailureMessage ?? "Payment failed.");
        }

        var durationUnit = plan.DurationUnit.Trim().ToLowerInvariant() is "year" or "years"
            ? plan.Duration * 12 : plan.Duration;
        var start = DateTime.UtcNow;
        var membership = new CustomerMembership
        {
            CustomerId = customer.Id,
            MembershipPlanId = plan.Id,
            Status = SubscriptionStatus.PendingPayment,
            StartDate = start,
            EndDate = start.AddMonths(Math.Max(1, durationUnit)),
            NextBillingDate = start.AddMonths(Math.Max(1, durationUnit)),
            BillingCycle = BillingCycle.Monthly,
            RemainingSessions = plan.SessionLimit > 0 ? plan.SessionLimit : null,
            PaymentStatus = PaymentStatus.Success,
            OdooSyncJobTransactionId = idempotencyKey,
        };
        db.CustomerMemberships.Add(membership);

        db.OdooSyncJobs.Add(new OdooSyncJob
        {
            JobType = SyncJobType.SubscriptionCreate,
            Payload = Json.Stringify(new
            {
                customerId = customer.Id,
                membershipId = membership.Id,
                planId = plan.Id,
                odooProductId = plan.OdooProductId,
                transactionId = idempotencyKey,
                branchId = cmd.BranchId,
            }),
            MotionParkTransactionId = idempotencyKey,
        });

        await db.SaveChangesAsync(ct);
        await notifications.NotifyAsync(cmd.UserId, "payment.success",
            "تمت عملية الدفع بنجاح", "Payment successful",
            plan.NameAr, plan.NameEn,
            Domain.NotificationChannel.InApp, new { membershipId = membership.Id }, ct);
        await notifications.NotifyAsync(cmd.UserId, "membership.pending_activation",
            "جاري تفعيل عضويتك", "Membership activation in progress",
            plan.NameAr, plan.NameEn,
            Domain.NotificationChannel.InApp, new { membershipId = membership.Id }, ct);

        return SubscriptionMapper.ToDto(membership);
    }
}

public sealed class GetSubscriptionHandler(IApplicationDbContext db)
    : IRequestHandler<GetSubscriptionQuery, SubscriptionDto?>
{
    public async Task<SubscriptionDto?> Handle(GetSubscriptionQuery query, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == query.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var membership = await db.CustomerMemberships.Include(m => m.MembershipPlan)
            .Where(m => m.CustomerId == customer.Id)
            .OrderByDescending(m => m.StartDate)
            .FirstOrDefaultAsync(ct);
        return membership is null ? null : SubscriptionMapper.ToDto(membership);
    }
}

public sealed class CancelSubscriptionHandler(IApplicationDbContext db, INotificationService notifications)
    : IRequestHandler<CancelSubscriptionCommand, SubscriptionDto>
{
    public async Task<SubscriptionDto> Handle(CancelSubscriptionCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var membership = await db.CustomerMemberships.Include(m => m.MembershipPlan)
            .FirstOrDefaultAsync(m => m.Id == cmd.SubscriptionId && m.CustomerId == customer.Id, ct)
            ?? throw new NotFoundException("SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
        if (membership.Status == SubscriptionStatus.Cancelled)
            return SubscriptionMapper.ToDto(membership); // idempotent

        membership.Status = SubscriptionStatus.Cancelled;
        membership.AutoRenew = false;
        await db.SaveChangesAsync(ct);
        await notifications.NotifyAsync(cmd.UserId, "membership.cancelled",
            "تم إلغاء الاشتراك", "Subscription cancelled",
            cmd.Reason, cmd.Reason,
            Domain.NotificationChannel.InApp, new { subscriptionId = membership.Id }, ct);
        return SubscriptionMapper.ToDto(membership);
    }
}

public sealed class RenewSubscriptionHandler(
    IApplicationDbContext db,
    IPaymentProviderFactory paymentFactory,
    INotificationService notifications)
    : IRequestHandler<RenewSubscriptionCommand, SubscriptionDto>
{
    public async Task<SubscriptionDto> Handle(RenewSubscriptionCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var membership = await db.CustomerMemberships.Include(m => m.MembershipPlan)
            .FirstOrDefaultAsync(m => m.Id == cmd.SubscriptionId && m.CustomerId == customer.Id, ct)
            ?? throw new NotFoundException("SUBSCRIPTION_NOT_FOUND", "Subscription not found.");

        var provider = paymentFactory.GetProvider();
        if (!provider.IsConfigured) throw new PaymentRequiredException();

        var plan = membership.MembershipPlan;
        var idempotencyKey = Guid.NewGuid().ToString();
        var charge = await provider.ChargeAsync(new PaymentChargeRequest(
            plan.Price, plan.Currency, customer.Id, idempotencyKey, cmd.PaymentMethodId,
            new Dictionary<string, string> { ["renew"] = membership.Id.ToString() }), ct);
        await PaymentReplayGuard.EnsureNotReusedAsync(db, provider.Name, charge, ct);
        if (!charge.Success)
            throw new ConflictException("PAYMENT_FAILED", charge.FailureMessage ?? "Payment failed.");

        var payment = new Payment
        {
            CustomerId = customer.Id,
            CustomerMembershipId = membership.Id,
            Amount = plan.Price,
            Vat = Math.Round(plan.Price * plan.Vat / 100m, 2),
            Currency = plan.Currency,
            Status = PaymentStatus.Success,
            PaymentMethod = cmd.PaymentMethodId,
            IdempotencyKey = idempotencyKey,
        };
        db.Payments.Add(payment);
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            PaymentId = payment.Id,
            Provider = provider.Name,
            Amount = plan.Price,
            Currency = plan.Currency,
            Status = PaymentStatus.Success,
            IdempotencyKey = idempotencyKey,
            ProviderReference = charge.ProviderReference,
        });

        var baseDate = membership.EndDate > DateTime.UtcNow ? membership.EndDate!.Value : DateTime.UtcNow;
        var durationUnit = plan.DurationUnit.Trim().ToLowerInvariant() is "year" or "years" ? plan.Duration * 12 : plan.Duration;
        membership.EndDate = baseDate.AddMonths(Math.Max(1, durationUnit));
        membership.NextBillingDate = membership.EndDate;
        membership.Status = SubscriptionStatus.PendingPayment;
        membership.PaymentStatus = PaymentStatus.Success;
        membership.RemainingSessions = plan.SessionLimit > 0 ? plan.SessionLimit : null;

        db.OdooSyncJobs.Add(new OdooSyncJob
        {
            JobType = SyncJobType.SubscriptionCreate,
            Payload = Json.Stringify(new
            {
                customerId = customer.Id, membershipId = membership.Id, planId = plan.Id,
                odooProductId = plan.OdooProductId, transactionId = idempotencyKey, renew = true,
            }),
            MotionParkTransactionId = idempotencyKey,
        });

        await db.SaveChangesAsync(ct);
        await notifications.NotifyAsync(cmd.UserId, "membership.renewed",
            "تم تجديد اشتراكك", "Subscription renewed",
            plan.NameAr, plan.NameEn,
            Domain.NotificationChannel.InApp, new { subscriptionId = membership.Id }, ct);
        return SubscriptionMapper.ToDto(membership);
    }
}
