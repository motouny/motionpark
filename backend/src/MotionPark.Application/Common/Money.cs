namespace MotionPark.Application.Common;

public static class Money
{
    /// <summary>Integer amount in the currency's smallest unit (SAR → halalas), as payment gateways expect.</summary>
    public static long ToMinorUnits(decimal amount, string currency)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive.");
        var exponent = currency.ToUpperInvariant() switch
        {
            "KWD" or "BHD" or "OMR" or "JOD" or "TND" or "IQD" or "LYD" => 3,
            "JPY" or "KRW" => 0,
            _ => 2,
        };
        var scaled = amount * (decimal)Math.Pow(10, exponent);
        if (scaled != decimal.Truncate(scaled))
            throw new ArgumentException($"Amount {amount} has more precision than {currency} allows.");
        return (long)scaled;
    }
}
