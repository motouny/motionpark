using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Customers;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Integrations;

namespace MotionPark.Application.Auth;

public record AuthUserDto(Guid Id, string Name, string? Email, string Phone, string PreferredLanguage, IReadOnlyList<string> Roles);
public record AuthResult(string AccessToken, DateTime AccessTokenExpiresAt, string RefreshToken, AuthUserDto User);

public record RegisterCommand(string Name, string? Email, string Phone, string Password, string PreferredLanguage)
    : IRequest<AuthResult>;
public record LoginQuery(string Identifier, string Password) : IRequest<AuthResult>;
public record RefreshCommand(string RefreshToken) : IRequest<AuthResult>;
public record LogoutCommand(string? RefreshToken) : IRequest<bool>;
public record ForgotPasswordCommand(string Identifier) : IRequest<bool>;
public record ResetPasswordCommand(string Token, string NewPassword) : IRequest<bool>;

public class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).NotEmpty().Must(p => PhoneNormalizer.Normalize(p) is not null)
            .WithMessage("A valid Saudi mobile number is required.");
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Password).MinimumLength(8).MaximumLength(100)
            .Matches("[A-Za-z]").WithMessage("Password must contain a letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
        RuleFor(x => x.PreferredLanguage).Must(l => l is "ar" or "en").WithMessage("Language must be 'ar' or 'en'.");
    }
}

public class LoginValidator : AbstractValidator<LoginQuery>
{
    public LoginValidator()
    {
        RuleFor(x => x.Identifier).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword).MinimumLength(8).Matches("[A-Za-z]").Matches("[0-9]");
    }
}

public sealed class RegisterHandler(
    IApplicationDbContext db,
    ITokenService tokens,
    ICurrentUserService currentUser,
    IValidator<RegisterCommand> validator)
    : IRequestHandler<RegisterCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RegisterCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Registration failed validation.", validation.ToDictionary());

        var phone = PhoneNormalizer.Normalize(cmd.Phone)!;
        var normalizedEmail = string.IsNullOrWhiteSpace(cmd.Email) ? null : cmd.Email.Trim().ToUpperInvariant();

        if (await db.Users.AnyAsync(u => u.Phone == phone, ct))
            throw new ConflictException("PHONE_ALREADY_REGISTERED", "An account with this phone number already exists.");
        if (normalizedEmail is not null && await db.Users.AnyAsync(u => u.NormalizedEmail == normalizedEmail, ct))
            throw new ConflictException("EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");

        var user = new User
        {
            Name = cmd.Name.Trim(),
            Email = cmd.Email?.Trim() ?? string.Empty,
            NormalizedEmail = normalizedEmail,
            Phone = phone,
            PreferredLanguage = cmd.PreferredLanguage,
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, cmd.Password);
        db.Users.Add(user);

        var customer = new Customer { UserId = user.Id, Name = user.Name, Phone = phone, Email = user.Email };
        db.Customers.Add(customer);

        // Odoo partner sync is queued; registration MUST succeed even when Odoo is down.
        var txId = customer.Id.ToString();
        if (!await db.OdooSyncJobs.AnyAsync(j => j.MotionParkTransactionId == txId, ct))
        {
            db.OdooSyncJobs.Add(new OdooSyncJob
            {
                JobType = SyncJobType.PartnerSync,
                Payload = System.Text.Json.JsonSerializer.Serialize(new { customerId = customer.Id }),
                MotionParkTransactionId = txId,
            });
        }

        var (refreshToken, refreshHash, expiresAt) = tokens.GenerateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = expiresAt,
            CreatedByIp = currentUser.IpAddress ?? string.Empty,
        });

        await db.SaveChangesAsync(ct);
        return await AuthResultFactory.CreateAsync(db, tokens, user, refreshToken, ct);
    }
}

public sealed class LoginHandler(
    IApplicationDbContext db,
    ITokenService tokens,
    ICurrentUserService currentUser,
    IValidator<LoginQuery> validator)
    : IRequestHandler<LoginQuery, AuthResult>
{
    public async Task<AuthResult> Handle(LoginQuery query, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(query, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Login failed validation.", validation.ToDictionary());

        var identifier = query.Identifier.Trim();
        var normalizedPhone = PhoneNormalizer.Normalize(identifier);
        var normalizedEmail = identifier.Contains('@') ? identifier.ToUpperInvariant() : null;

        var user = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u =>
                (normalizedEmail != null && u.NormalizedEmail == normalizedEmail) || u.Phone == normalizedPhone,
                ct);

        if (user is null || !user.IsActive)
            throw new UnauthorizedAppException();

        if (user.LockoutEnd is { } lockout && lockout > DateTime.UtcNow)
            throw new ForbiddenAppException("Account is temporarily locked. Try again later.");

        var verification = new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, query.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                user.AccessFailedCount = 0;
            }
            await db.SaveChangesAsync(ct);
            throw new UnauthorizedAppException();
        }

        user.AccessFailedCount = 0;
        user.LockoutEnd = null;

        var (refreshToken, refreshHash, expiresAt) = tokens.GenerateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = expiresAt,
            CreatedByIp = currentUser.IpAddress ?? string.Empty,
        });
        await db.SaveChangesAsync(ct);

        return await AuthResultFactory.CreateAsync(db, tokens, user, refreshToken, ct);
    }
}

public sealed class RefreshHandler(IApplicationDbContext db, ITokenService tokens, ICurrentUserService currentUser)
    : IRequestHandler<RefreshCommand, AuthResult>
{
    public async Task<AuthResult> Handle(RefreshCommand cmd, CancellationToken ct)
    {
        var hash = Crypto.Sha256Hex(cmd.RefreshToken);
        var existing = await db.RefreshTokens
            .Include(r => r.User).ThenInclude(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(r => r.TokenHash == hash, ct);

        if (existing is null || !existing.IsActive || !existing.User.IsActive)
            throw new UnauthorizedAppException("Invalid or expired refresh token.");

        var (refreshToken, refreshHash, expiresAt) = tokens.GenerateRefreshToken();
        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenHash = refreshHash;
        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = existing.UserId,
            TokenHash = refreshHash,
            ExpiresAt = expiresAt,
            CreatedByIp = currentUser.IpAddress ?? string.Empty,
        });
        await db.SaveChangesAsync(ct);

        return await AuthResultFactory.CreateAsync(db, tokens, existing.User, refreshToken, ct);
    }
}

public sealed class LogoutHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<LogoutCommand, bool>
{
    public async Task<bool> Handle(LogoutCommand cmd, CancellationToken ct)
    {
        IQueryable<RefreshToken> tokensToRevoke = db.RefreshTokens;
        if (!string.IsNullOrWhiteSpace(cmd.RefreshToken))
        {
            var hash = Crypto.Sha256Hex(cmd.RefreshToken);
            tokensToRevoke = tokensToRevoke.Where(r => r.TokenHash == hash);
        }
        else if (currentUser.UserId is { } userId)
        {
            tokensToRevoke = tokensToRevoke.Where(r => r.UserId == userId);
        }
        else
        {
            return true;
        }

        var tokens = await tokensToRevoke.ToListAsync(ct);
        foreach (var token in tokens) token.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class ForgotPasswordHandler(IApplicationDbContext db, INotificationService notifications)
    : IRequestHandler<ForgotPasswordCommand, bool>
{
    public async Task<bool> Handle(ForgotPasswordCommand cmd, CancellationToken ct)
    {
        var identifier = cmd.Identifier.Trim();
        var phone = PhoneNormalizer.Normalize(identifier);
        var email = identifier.Contains('@') ? identifier.ToUpperInvariant() : null;

        var user = await db.Users.FirstOrDefaultAsync(u =>
            (email != null && u.NormalizedEmail == email) || u.Phone == phone, ct);

        // Always 200 — never reveal whether the account exists.
        if (user is null) return true;

        var raw = Crypto.NewOpaqueToken(32);
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = Crypto.Sha256Hex(raw),
            ExpiresAt = DateTime.UtcNow.AddHours(1),
        });
        await db.SaveChangesAsync(ct);

        await notifications.NotifyAsync(user.Id, "auth.password_reset",
            "إعادة تعيين كلمة المرور", "Password reset",
            $"رمز إعادة التعيين: {raw}", $"Reset code: {raw}",
            Domain.NotificationChannel.Email, null, ct);
        return true;
    }
}

public sealed class ResetPasswordHandler(IApplicationDbContext db, IValidator<ResetPasswordCommand> validator)
    : IRequestHandler<ResetPasswordCommand, bool>
{
    public async Task<bool> Handle(ResetPasswordCommand cmd, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(cmd, ct);
        if (!validation.IsValid)
            throw new ValidationAppException("Reset password failed validation.", validation.ToDictionary());

        var hash = Crypto.Sha256Hex(cmd.Token);
        var token = await db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is null || !token.IsUsable)
            throw new UnauthorizedAppException("Invalid or expired reset token.");

        token.User.PasswordHash = new PasswordHasher<User>().HashPassword(token.User, cmd.NewPassword);
        token.User.SecurityStamp = Guid.NewGuid().ToString("N");
        token.UsedAt = DateTime.UtcNow;

        var activeTokens = await db.RefreshTokens
            .Where(r => r.UserId == token.UserId && r.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var rt in activeTokens) rt.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }
}

internal static class AuthResultFactory
{
    public static Task<AuthResult> CreateAsync(
        IApplicationDbContext db, ITokenService tokens, User user, string refreshToken, CancellationToken ct)
    {
        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var access = tokens.GenerateAccessToken(user, roles);
        var dto = new AuthUserDto(user.Id, user.Name, string.IsNullOrEmpty(user.Email) ? null : user.Email,
            user.Phone, user.PreferredLanguage, roles);
        return Task.FromResult(new AuthResult(access, DateTime.UtcNow.Add(tokens.AccessTokenLifetime), refreshToken, dto));
    }
}
