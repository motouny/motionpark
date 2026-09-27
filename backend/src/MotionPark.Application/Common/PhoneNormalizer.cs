using System.Text.RegularExpressions;

namespace MotionPark.Application.Common;

public static partial class PhoneNormalizer
{
    /// <summary>
    /// Canonicalizes Saudi numbers. Accepts 05xxxxxxxx / 5xxxxxxxx / 9665xxxxxxxx / +9665xxxxxxxx
    /// and returns +9665xxxxxxxx. Returns null when the input is not a plausible KSA mobile.
    /// </summary>
    public static string? Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = DigitsOnly().Replace(phone.Trim(), string.Empty);

        if (digits.StartsWith("00966", StringComparison.Ordinal)) digits = digits[5..];
        if (digits.StartsWith("966", StringComparison.Ordinal)) digits = digits[3..];
        if (digits.StartsWith('0')) digits = digits[1..];

        if (digits.Length == 9 && digits.StartsWith('5')) return $"+966{digits}";
        return null;
    }

    /// <summary>Loose normalization for lead capture (keeps whatever digits we got).</summary>
    public static string NormalizeLoose(string? phone) => Normalize(phone) ?? phone?.Trim() ?? string.Empty;

    [GeneratedRegex("\\D")]
    private static partial Regex DigitsOnly();
}
