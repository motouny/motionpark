namespace MotionPark.Application.Abstractions;

public sealed record PaymentChargeRequest(
    decimal Amount,
    string Currency,
    Guid CustomerId,
    string? IdempotencyKey,
    string? PaymentMethod,
    IReadOnlyDictionary<string, string>? Metadata);

public sealed record PaymentChargeResult(
    bool Success,
    string? ProviderReference,
    string? FailureCode,
    string? FailureMessage,
    string? RawStatus);

public interface IPaymentProvider
{
    string Name { get; }
    bool IsConfigured { get; }
    Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default);
}

/// <summary>Non-secret settings the browser needs to render the provider's payment form.</summary>
public sealed record PaymentClientConfig(string Provider, string? PublishableKey, string? CallbackUrl);

public interface IPaymentProviderFactory
{
    IPaymentProvider GetProvider();
    PaymentClientConfig GetClientConfig() => new(GetProvider().Name, null, null);
}
