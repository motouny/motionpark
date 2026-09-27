using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Dtos;
using MotionPark.Application.Messaging;
using MotionPark.Application.Subscriptions;
using MotionPark.Domain;
using MotionPark.Domain.Membership;

namespace MotionPark.Application.Account;

public record ProfileDto(
    Guid CustomerId, string Name, string? Email, string Phone, string PreferredLanguage,
    DateTime? DateOfBirth, string? Gender);

public record GetProfileQuery(Guid UserId) : IRequest<ProfileDto>;
public record UpdateProfileCommand(Guid UserId, string? Name, string? Email, string? PreferredLanguage, DateTime? DateOfBirth, string? Gender)
    : IRequest<ProfileDto>;

public record MembershipViewDto(SubscriptionDto Subscription, MembershipPlanDto Plan);
public record GetMembershipQuery(Guid UserId) : IRequest<MembershipViewDto?>;
public record QrResult(string QrToken);
public record GetQrCommand(Guid UserId) : IRequest<QrResult>;

public sealed class GetProfileHandler(IApplicationDbContext db)
    : IRequestHandler<GetProfileQuery, ProfileDto>
{
    public async Task<ProfileDto> Handle(GetProfileQuery query, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == query.UserId, ct)
            ?? throw new NotFoundException("USER_NOT_FOUND", "User not found.");
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == query.UserId, ct);
        return new ProfileDto(customer?.Id ?? user.Id, customer?.Name ?? user.Name,
            string.IsNullOrEmpty(user.Email) ? customer?.Email : user.Email,
            customer?.Phone ?? user.Phone, user.PreferredLanguage,
            customer?.DateOfBirth, customer?.Gender);
    }
}

public sealed class UpdateProfileHandler(IApplicationDbContext db)
    : IRequestHandler<UpdateProfileCommand, ProfileDto>
{
    public async Task<ProfileDto> Handle(UpdateProfileCommand cmd, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == cmd.UserId, ct)
            ?? throw new NotFoundException("USER_NOT_FOUND", "User not found.");
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct);

        if (!string.IsNullOrWhiteSpace(cmd.Name))
        {
            user.Name = cmd.Name.Trim();
            if (customer is not null) customer.Name = user.Name;
        }
        if (!string.IsNullOrWhiteSpace(cmd.Email))
        {
            user.Email = cmd.Email.Trim();
            user.NormalizedEmail = user.Email.ToUpperInvariant();
            if (customer is not null) customer.Email = user.Email;
        }
        if (!string.IsNullOrWhiteSpace(cmd.PreferredLanguage) && cmd.PreferredLanguage is "ar" or "en")
            user.PreferredLanguage = cmd.PreferredLanguage;
        if (cmd.DateOfBirth.HasValue && customer is not null) customer.DateOfBirth = cmd.DateOfBirth;
        if (!string.IsNullOrWhiteSpace(cmd.Gender) && customer is not null) customer.Gender = cmd.Gender;

        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new ProfileDto(customer?.Id ?? user.Id, customer?.Name ?? user.Name,
            string.IsNullOrEmpty(user.Email) ? customer?.Email : user.Email,
            customer?.Phone ?? user.Phone, user.PreferredLanguage,
            customer?.DateOfBirth, customer?.Gender);
    }
}

public sealed class GetMembershipHandler(IApplicationDbContext db)
    : IRequestHandler<GetMembershipQuery, MembershipViewDto?>
{
    public async Task<MembershipViewDto?> Handle(GetMembershipQuery query, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == query.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var membership = await db.CustomerMemberships.Include(m => m.MembershipPlan)
            .Where(m => m.CustomerId == customer.Id
                && (m.Status == SubscriptionStatus.Active || m.Status == SubscriptionStatus.PendingPayment || m.Status == SubscriptionStatus.Paused))
            .OrderByDescending(m => m.StartDate)
            .FirstOrDefaultAsync(ct);
        if (membership is null) return null;
        return new MembershipViewDto(SubscriptionMapper.ToDto(membership), PlanMapper.ToDto(membership.MembershipPlan));
    }
}

/// <summary>QR token rotates on every fetch; only its SHA-256 is persisted. Contains no PII.</summary>
public sealed class GetQrHandler(IApplicationDbContext db, ITokenService tokens)
    : IRequestHandler<GetQrCommand, QrResult>
{
    public async Task<QrResult> Handle(GetQrCommand cmd, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == cmd.UserId, ct)
            ?? throw new NotFoundException("PROFILE_INCOMPLETE", "No customer profile for this account.");
        var membership = await db.CustomerMemberships
            .FirstOrDefaultAsync(m => m.CustomerId == customer.Id, ct)
            ?? throw new NotFoundException("MEMBERSHIP_NOT_FOUND", "No membership found for this account.");

        var (token, hash, _) = tokens.GenerateQrToken();
        membership.QrTokenHash = hash;
        membership.QrTokenRotatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new QrResult(token);
    }
}
