using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Abstractions;

namespace MotionPark.Infrastructure.Payments;

/// <summary>Default production provider: payments are NOT configured — endpoints return 402, never fake success.</summary>
public sealed class NotConfiguredPaymentProvider : IPaymentProvider
{
    public string Name => "not-configured";
    public bool IsConfigured => false;
    public Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default)
        => Task.FromResult(new PaymentChargeResult(false, null, "PAYMENT_CREDENTIALS_REQUIRED",
            "Payment provider is not configured.", "not_configured"));
}

/// <summary>Development-only provider. Enabled only when PAYMENT_PROVIDER=mock (never in production config).</summary>
public sealed class MockPaymentProvider(ILogger<MockPaymentProvider> logger) : IPaymentProvider
{
    public string Name => "mock";
    public bool IsConfigured => true;

    public Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default)
    {
        logger.LogInformation("MockPaymentProvider charged {Amount} {Currency} for customer {CustomerId} (key {Key})",
            request.Amount, request.Currency, request.CustomerId, request.IdempotencyKey);
        return Task.FromResult(new PaymentChargeResult(true, $"mock_{Guid.NewGuid():N}", null, null, "captured"));
    }
}

public sealed class PaymentProviderFactory(
    IConfiguration config, ILoggerFactory loggerFactory, IHttpClientFactory httpClientFactory) : IPaymentProviderFactory
{
    public const string MoyasarHttpClient = "moyasar";

    public IPaymentProvider GetProvider()
    {
        var provider = (config["PAYMENT_PROVIDER"] ?? string.Empty).Trim().ToLowerInvariant();
        return provider switch
        {
            "moyasar" => new MoyasarPaymentProvider(httpClientFactory.CreateClient(MoyasarHttpClient),
                MoyasarOptions.FromConfiguration(config), loggerFactory.CreateLogger<MoyasarPaymentProvider>()),
            "mock" => new MockPaymentProvider(loggerFactory.CreateLogger<MockPaymentProvider>()),
            _ => new NotConfiguredPaymentProvider(),
        };
    }
}
