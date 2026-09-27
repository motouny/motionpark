using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain.Identity;

namespace MotionPark.Infrastructure.Auth;

public sealed class JwtTokenService : ITokenService
{
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessMinutes;
    private readonly int _refreshDays;
    private readonly SigningCredentials _credentials;

    public JwtTokenService(IConfiguration config)
    {
        _issuer = config["JWT_ISSUER"] ?? "motionpark";
        _audience = config["JWT_AUDIENCE"] ?? "motionpark";
        _accessMinutes = int.TryParse(config["JWT_ACCESS_TOKEN_MINUTES"], out var m) && m > 0 ? m : 15;
        _refreshDays = int.TryParse(config["JWT_REFRESH_TOKEN_DAYS"], out var d) && d > 0 ? d : 30;

        var secret = config["JWT_SECRET"] ?? string.Empty;
        // Derive a stable 256-bit key even if the secret is shorter/longer.
        var keyBytes = Encoding.UTF8.GetByteCount(secret) >= 64 && IsBase64(secret)
            ? Convert.FromBase64String(secret)
            : System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        _credentials = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);
    }

    public TimeSpan AccessTokenLifetime => TimeSpan.FromMinutes(_accessMinutes);

    public string GenerateAccessToken(User user, IReadOnlyCollection<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("name", user.Name),
            new("phone", user.Phone),
            new("security_stamp", user.SecurityStamp),
        };
        if (!string.IsNullOrEmpty(user.Email))
            claims.Add(new Claim(JwtRegisteredClaimNames.Email, user.Email));
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_accessMinutes),
            signingCredentials: _credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string Token, string Hash, DateTime ExpiresAt) GenerateRefreshToken()
        => NewToken(_refreshDays);

    public (string Token, string Hash, DateTime ExpiresAt) GenerateQrToken()
        => NewToken(180); // rotating QR token — a few minutes of validity per rotation is plenty

    private static (string Token, string Hash, DateTime ExpiresAt) NewToken(int days)
    {
        var token = Crypto.NewOpaqueToken(48);
        return (token, Crypto.Sha256Hex(token), DateTime.UtcNow.AddDays(days));
    }

    private static bool IsBase64(string value)
    {
        Span<byte> buffer = stackalloc byte[value.Length];
        return Convert.TryFromBase64String(value, buffer, out _);
    }
}
