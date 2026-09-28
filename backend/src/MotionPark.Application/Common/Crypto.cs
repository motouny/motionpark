using System.Security.Cryptography;
using System.Text;

namespace MotionPark.Application.Common;

public static class Crypto
{
    public static string Sha256Hex(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static string NewOpaqueToken(int bytes = 48)
    {
        var buffer = RandomNumberGenerator.GetBytes(bytes);
        return Convert.ToBase64String(buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public static string NewPin(int digits = 6)
        => RandomNumberGenerator.GetInt32(0, (int)Math.Pow(10, digits)).ToString($"D{digits}");
}
