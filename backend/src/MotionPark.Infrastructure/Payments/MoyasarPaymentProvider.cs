using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;

namespace MotionPark.Infrastructure.Payments;

public sealed record MoyasarOptions(string SecretKey, string? PublishableKey, string? CallbackUrl, Uri ApiBaseUrl)
{
    public static readonly Uri DefaultApiBaseUrl = new("https://api.moyasar.com/v1/");

    public static MoyasarOptions FromConfiguration(IConfiguration config)
    {
        var apiUrl = config["MOYASAR_API_URL"];
        return new MoyasarOptions(
            (config["PAYMENT_SECRET"] ?? string.Empty).Trim(),
            config["PAYMENT_KEY"]?.Trim(),
            config["PAYMENT_CALLBACK_URL"]?.Trim(),
            string.IsNullOrWhiteSpace(apiUrl) ? DefaultApiBaseUrl : new Uri(apiUrl.TrimEnd('/') + "/"));
    }
}

/// <summary>
/// Moyasar (Saudi Arabia) — mada, Visa/Mastercard and Apple Pay.
/// PaymentMethod is either:
///   • a Moyasar payment id created in the browser by the Moyasar payment form (mada/cards/Apple Pay; the form runs 3-D Secure).
///     The payment is fetched with the secret key and accepted only if it is paid for the exact amount and currency.
///   • "applepay:&lt;Apple Pay payment token JSON&gt;" from a native Apple Pay sheet; the payment is created server-side.
/// Card data never reaches this API.
/// </summary>
public sealed class MoyasarPaymentProvider(HttpClient http, MoyasarOptions options, ILogger<MoyasarPaymentProvider> logger)
    : IPaymentProvider
{
    public const string ApplePayPrefix = "applepay:";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public string Name => "moyasar";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.SecretKey);

    public async Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default)
    {
        if (!IsConfigured)
            return new PaymentChargeResult(false, null, "PAYMENT_CREDENTIALS_REQUIRED", "Payment provider is not configured.", "not_configured");

        var method = request.PaymentMethod?.Trim();
        if (string.IsNullOrEmpty(method))
            return Fail(null, "PAYMENT_METHOD_REQUIRED", "A Moyasar payment id or Apple Pay token is required.", null);

        long expectedAmount;
        try
        {
            expectedAmount = ToMinorUnits(request.Amount, request.Currency);
        }
        catch (ArgumentException ex)
        {
            return Fail(null, "PAYMENT_INVALID_AMOUNT", ex.Message, null);
        }

        try
        {
            MoyasarPayment? payment;
            if (method.StartsWith(ApplePayPrefix, StringComparison.OrdinalIgnoreCase))
            {
                payment = await CreateApplePayPaymentAsync(request, expectedAmount, method[ApplePayPrefix.Length..], ct);
            }
            else
            {
                if (!IsPaymentId(method))
                    return Fail(null, "PAYMENT_METHOD_INVALID", "Unrecognised payment method.", null);
                payment = await GetPaymentAsync(method, ct);
            }

            if (payment is null)
                return Fail(null, "PAYMENT_NOT_FOUND", "Payment not found at Moyasar.", null);

            return await VerifyAsync(payment, request, expectedAmount, ct);
        }
        catch (MoyasarApiException ex)
        {
            logger.LogWarning("Moyasar API error {Status} {Type}: {Message}", (int)ex.StatusCode, ex.ErrorType, ex.Message);
            return ex.StatusCode switch
            {
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden =>
                    Fail(null, "PAYMENT_PROVIDER_AUTH_FAILED", "Payment provider rejected the credentials.", ex.ErrorType),
                _ => Fail(null, "PAYMENT_DECLINED", ex.Message, ex.ErrorType),
            };
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException { CancellationToken.IsCancellationRequested: false } or JsonException)
        {
            logger.LogError(ex, "Moyasar request failed");
            return Fail(null, "PAYMENT_PROVIDER_UNAVAILABLE", "Payment provider is unavailable. Please try again.", null);
        }
    }

    private async Task<PaymentChargeResult> VerifyAsync(
        MoyasarPayment payment, PaymentChargeRequest request, long expectedAmount, CancellationToken ct)
    {
        if (!string.Equals(payment.Currency, request.Currency, StringComparison.OrdinalIgnoreCase) || payment.Amount != expectedAmount)
        {
            logger.LogWarning("Moyasar payment {Id} amount mismatch: got {Amount} {Currency}, expected {Expected} {ExpectedCurrency}",
                payment.Id, payment.Amount, payment.Currency, expectedAmount, request.Currency);
            return Fail(payment.Id, "PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match the order.", payment.Status);
        }

        if (payment.Metadata is { } metadata
            && metadata.TryGetValue("customer_id", out var customerId)
            && !string.Equals(customerId?.ToString(), request.CustomerId.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return Fail(payment.Id, "PAYMENT_CUSTOMER_MISMATCH", "Payment belongs to another customer.", payment.Status);
        }

        switch (payment.Status)
        {
            case "paid":
            case "captured":
                return new PaymentChargeResult(true, payment.Id, null, null, payment.Status);
            case "authorized":
                var captured = await CaptureAsync(payment.Id, ct);
                return captured.Status is "captured" or "paid"
                    ? new PaymentChargeResult(true, captured.Id, null, null, captured.Status)
                    : Fail(captured.Id, "PAYMENT_CAPTURE_FAILED", "Payment could not be captured.", captured.Status);
            case "initiated":
                return Fail(payment.Id, "PAYMENT_NOT_COMPLETED", "Payment was not completed (3-D Secure pending).", payment.Status);
            default:
                return Fail(payment.Id, "PAYMENT_DECLINED",
                    string.IsNullOrWhiteSpace(payment.Source?.Message) ? "Payment was declined." : payment.Source!.Message!,
                    payment.Status);
        }
    }

    private async Task<MoyasarPayment?> GetPaymentAsync(string id, CancellationToken ct)
    {
        using var message = NewRequest(HttpMethod.Get, $"payments/{Uri.EscapeDataString(id)}");
        using var response = await http.SendAsync(message, ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        return await ReadAsync(response, ct);
    }

    private async Task<MoyasarPayment> CaptureAsync(string id, CancellationToken ct)
    {
        using var message = NewRequest(HttpMethod.Post, $"payments/{Uri.EscapeDataString(id)}/capture");
        message.Content = JsonContent.Create(new { }, options: JsonOptions);
        using var response = await http.SendAsync(message, ct);
        return await ReadAsync(response, ct);
    }

    private async Task<MoyasarPayment> CreateApplePayPaymentAsync(
        PaymentChargeRequest request, long amount, string applePayToken, CancellationToken ct)
    {
        var metadata = new Dictionary<string, string>(request.Metadata ?? new Dictionary<string, string>())
        {
            ["customer_id"] = request.CustomerId.ToString(),
        };
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey)) metadata["idempotency_key"] = request.IdempotencyKey!;

        var body = new
        {
            GivenId = GivenId(request.IdempotencyKey),
            Amount = amount,
            Currency = request.Currency.ToUpperInvariant(),
            Description = "Motion Park membership",
            CallbackUrl = options.CallbackUrl,
            Source = new { Type = "applepay", Token = applePayToken },
            Metadata = metadata,
        };

        using var message = NewRequest(HttpMethod.Post, "payments");
        message.Content = JsonContent.Create(body, options: JsonOptions);
        using var response = await http.SendAsync(message, ct);
        return await ReadAsync(response, ct);
    }

    private HttpRequestMessage NewRequest(HttpMethod method, string path)
    {
        var message = new HttpRequestMessage(method, new Uri(options.ApiBaseUrl, path));
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes(options.SecretKey + ":"));
        message.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return message;
    }

    private static async Task<MoyasarPayment> ReadAsync(HttpResponseMessage response, CancellationToken ct)
    {
        if (!response.IsSuccessStatusCode)
        {
            MoyasarError? error = null;
            try { error = await response.Content.ReadFromJsonAsync<MoyasarError>(JsonOptions, ct); }
            catch (JsonException) { }
            throw new MoyasarApiException(response.StatusCode, error?.Type, error?.Message ?? $"Moyasar returned {(int)response.StatusCode}.");
        }
        return await response.Content.ReadFromJsonAsync<MoyasarPayment>(JsonOptions, ct)
            ?? throw new JsonException("Empty Moyasar response.");
    }

    private static PaymentChargeResult Fail(string? reference, string code, string message, string? rawStatus)
        => new(false, reference, code, message, rawStatus ?? "failed");

    // Moyasar payment ids are UUIDs.
    private static bool IsPaymentId(string value) => Guid.TryParse(value, out _);

    /// <summary>Moyasar's given_id must be a UUID; derive a stable one from the idempotency key so retries never double-charge.</summary>
    public static Guid GivenId(string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey)) return Guid.NewGuid();
        if (Guid.TryParse(idempotencyKey, out var parsed)) return parsed;
        var hash = System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(idempotencyKey));
        var bytes = hash[..16];
        bytes[7] = (byte)((bytes[7] & 0x0F) | 0x50); // version 5-style
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80); // RFC 4122 variant
        return new Guid(bytes);
    }

    /// <summary>Moyasar amounts are integers in the currency's smallest unit (SAR → halalas).</summary>
    public static long ToMinorUnits(decimal amount, string currency) => Money.ToMinorUnits(amount, currency);

    private sealed class MoyasarPayment
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public long Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public MoyasarSource? Source { get; set; }
        public Dictionary<string, object?>? Metadata { get; set; }
    }

    private sealed class MoyasarSource
    {
        public string? Type { get; set; }
        public string? Company { get; set; }
        public string? Message { get; set; }
    }

    private sealed class MoyasarError
    {
        public string? Type { get; set; }
        public string? Message { get; set; }
    }

    private sealed class MoyasarApiException(HttpStatusCode statusCode, string? errorType, string message) : Exception(message)
    {
        public HttpStatusCode StatusCode { get; } = statusCode;
        public string? ErrorType { get; } = errorType;
    }
}
