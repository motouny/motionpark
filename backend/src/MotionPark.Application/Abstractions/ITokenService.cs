using MotionPark.Domain.Identity;

namespace MotionPark.Application.Abstractions;

public interface ITokenService
{
    TimeSpan AccessTokenLifetime { get; }
    string GenerateAccessToken(User user, IReadOnlyCollection<string> roles);
    (string Token, string Hash, DateTime ExpiresAt) GenerateRefreshToken();
    (string Token, string Hash, DateTime ExpiresAt) GenerateQrToken();
}
