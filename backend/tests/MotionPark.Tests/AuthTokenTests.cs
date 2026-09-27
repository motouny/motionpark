using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Auth;
using MotionPark.Application.Common;
using MotionPark.Domain.Integrations;
using MotionPark.Infrastructure.Auth;

using Xunit;

using MotionPark.Application.Abstractions;
using MotionPark.Domain;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class AuthTokenTests
{
    private static RegisterHandler RegisterHandler(MotionParkDbContext db, ITokenService tokens, FakeCurrentUser currentUser)
        => new(db, tokens, currentUser, new RegisterValidator());

    private static LoginHandler LoginHandler(MotionParkDbContext db, ITokenService tokens, FakeCurrentUser currentUser)
        => new(db, tokens, currentUser, new LoginValidator());

    private static RefreshHandler RefreshHandler(MotionParkDbContext db, ITokenService tokens, FakeCurrentUser currentUser)
        => new(db, tokens, currentUser);

    [Fact]
    public async Task Register_creates_user_customer_and_tokens_and_enqueues_partner_sync()
    {
        await using var db = TestFactory.NewDbContext();
        var tokens = new JwtTokenService(TestFactory.NewConfig());
        var result = await RegisterHandler(db, tokens, new FakeCurrentUser()).Handle(
            new RegisterCommand("سارة", "sara@motionpark.local", "0561234567", "Passw0rd123", "ar"),
            CancellationToken.None);

        Assert.NotEmpty(result.AccessToken);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("+966561234567", result.User.Phone);
        Assert.Equal(1, await db.Users.CountAsync());
        Assert.Equal(1, await db.Customers.CountAsync());
        Assert.Equal(SyncJobType.PartnerSync, (await db.OdooSyncJobs.SingleAsync()).JobType);
        Assert.True(DateTime.UtcNow.AddMinutes(14) < result.AccessTokenExpiresAt);

        // Access token parses and carries the user id claim.
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.AccessToken);
        Assert.Equal(result.User.Id.ToString(), jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
    }

    [Fact]
    public async Task Register_rejects_duplicate_phone()
    {
        await using var db = TestFactory.NewDbContext();
        var tokens = new JwtTokenService(TestFactory.NewConfig());
        var handler = RegisterHandler(db, tokens, new FakeCurrentUser());
        await handler.Handle(new RegisterCommand("A", null, "0561234567", "Passw0rd123", "ar"), CancellationToken.None);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            handler.Handle(new RegisterCommand("B", null, "+966 56 123 4567", "Passw0rd123", "en"), CancellationToken.None));
        Assert.Equal("PHONE_ALREADY_REGISTERED", ex.Code);
    }

    [Fact]
    public async Task Login_by_phone_or_email_and_wrong_password_rejected()
    {
        await using var db = TestFactory.NewDbContext();
        var tokens = new JwtTokenService(TestFactory.NewConfig());
        await RegisterHandler(db, tokens, new FakeCurrentUser()).Handle(
            new RegisterCommand("سارة", "sara@motionpark.local", "0561234567", "Passw0rd123", "ar"),
            CancellationToken.None);

        var byPhone = await LoginHandler(db, tokens, new FakeCurrentUser())
            .Handle(new LoginQuery("0561234567", "Passw0rd123"), CancellationToken.None);
        Assert.NotEmpty(byPhone.AccessToken);

        var byEmail = await LoginHandler(db, tokens, new FakeCurrentUser())
            .Handle(new LoginQuery("sara@motionpark.local", "Passw0rd123"), CancellationToken.None);
        Assert.NotEmpty(byEmail.AccessToken);

        await Assert.ThrowsAsync<UnauthorizedAppException>(() =>
            LoginHandler(db, tokens, new FakeCurrentUser())
                .Handle(new LoginQuery("0561234567", "WrongPass1"), CancellationToken.None));
    }

    [Fact]
    public async Task Refresh_rotates_token_and_revokes_old_one()
    {
        await using var db = TestFactory.NewDbContext();
        var tokens = new JwtTokenService(TestFactory.NewConfig());
        var register = await RegisterHandler(db, tokens, new FakeCurrentUser()).Handle(
            new RegisterCommand("سارة", null, "0561234567", "Passw0rd123", "ar"), CancellationToken.None);

        var refreshed = await RefreshHandler(db, tokens, new FakeCurrentUser())
            .Handle(new RefreshCommand(register.RefreshToken), CancellationToken.None);

        Assert.NotEqual(register.RefreshToken, refreshed.RefreshToken);
        Assert.NotEmpty(refreshed.AccessToken);

        // Old refresh token is revoked.
        await Assert.ThrowsAsync<UnauthorizedAppException>(() =>
            RefreshHandler(db, tokens, new FakeCurrentUser())
                .Handle(new RefreshCommand(register.RefreshToken), CancellationToken.None));
    }

    [Fact]
    public async Task Refresh_token_is_stored_hashed_only()
    {
        await using var db = TestFactory.NewDbContext();
        var tokens = new JwtTokenService(TestFactory.NewConfig());
        var register = await RegisterHandler(db, tokens, new FakeCurrentUser()).Handle(
            new RegisterCommand("سارة", null, "0561234567", "Passw0rd123", "ar"), CancellationToken.None);

        var stored = await db.RefreshTokens.SingleAsync();
        Assert.NotEqual(register.RefreshToken, stored.TokenHash);
        Assert.Equal(Crypto.Sha256Hex(register.RefreshToken), stored.TokenHash);
    }
}
