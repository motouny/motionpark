using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MotionPark.Application.Abstractions;
using MotionPark.Infrastructure.Payments;

namespace MotionPark.Tests;

public class MoyasarPaymentProviderTests
{
    private const string PaymentId = "f5b9a1f2-8c7d-4e2b-9a3c-1d2e3f4a5b6c";
    private static readonly Guid CustomerId = Guid.Parse("11111111-2222-3333-4444-555555555555");

    private static (MoyasarPaymentProvider Provider, StubHandler Handler) Create(
        Func<HttpRequestMessage, HttpResponseMessage> respond, string secret = "sk_test_abc")
    {
        var handler = new StubHandler(respond);
        var options = new MoyasarOptions(secret, "pk_test_abc", "https://motion-park.com/account/payments/callback",
            MoyasarOptions.DefaultApiBaseUrl);
        return (new MoyasarPaymentProvider(new HttpClient(handler), options, NullLogger<MoyasarPaymentProvider>.Instance), handler);
    }

    private static PaymentChargeRequest Request(string? method, decimal amount = 299m, string currency = "SAR")
        => new(amount, currency, CustomerId, "key-1", method, new Dictionary<string, string> { ["planId"] = "p1" });

    private static HttpResponseMessage Json(object body, HttpStatusCode status = HttpStatusCode.OK)
        => new(status) { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };

    private static object Payment(string status, long amount = 29900, string currency = "SAR",
        string company = "mada", object? metadata = null, string? message = null)
        => new
        {
            id = PaymentId, status, amount, currency,
            source = new { type = "creditcard", company, message },
            metadata = metadata ?? new { customer_id = CustomerId.ToString() },
        };

    [Fact]
    public async Task Paid_mada_payment_is_verified_with_the_secret_key()
    {
        var (provider, handler) = Create(_ => Json(Payment("paid")));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.True(result.Success);
        Assert.Equal(PaymentId, result.ProviderReference);
        Assert.Equal("paid", result.RawStatus);
        var sent = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Get, sent.Method);
        Assert.Equal($"https://api.moyasar.com/v1/payments/{PaymentId}", sent.Uri);
        Assert.Equal("Basic", sent.AuthScheme);
        Assert.Equal("sk_test_abc:", Encoding.ASCII.GetString(Convert.FromBase64String(sent.AuthParameter!)));
    }

    [Fact]
    public async Task Amount_mismatch_is_rejected()
    {
        var (provider, _) = Create(_ => Json(Payment("paid", amount: 100)));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.False(result.Success);
        Assert.Equal("PAYMENT_AMOUNT_MISMATCH", result.FailureCode);
    }

    [Fact]
    public async Task Currency_mismatch_is_rejected()
    {
        var (provider, _) = Create(_ => Json(Payment("paid", currency: "USD")));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_AMOUNT_MISMATCH", result.FailureCode);
    }

    [Fact]
    public async Task Payment_of_another_customer_is_rejected()
    {
        var (provider, _) = Create(_ => Json(Payment("paid", metadata: new { customer_id = Guid.NewGuid().ToString() })));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_CUSTOMER_MISMATCH", result.FailureCode);
    }

    [Fact]
    public async Task Initiated_payment_with_pending_3ds_is_not_accepted()
    {
        var (provider, _) = Create(_ => Json(Payment("initiated")));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.False(result.Success);
        Assert.Equal("PAYMENT_NOT_COMPLETED", result.FailureCode);
        Assert.Equal(PaymentId, result.ProviderReference);
    }

    [Fact]
    public async Task Failed_payment_surfaces_the_gateway_message()
    {
        var (provider, _) = Create(_ => Json(Payment("failed", message: "INSUFFICIENT_FUNDS")));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_DECLINED", result.FailureCode);
        Assert.Equal("INSUFFICIENT_FUNDS", result.FailureMessage);
    }

    [Fact]
    public async Task Authorized_payment_is_captured()
    {
        var (provider, handler) = Create(req => req.RequestUri!.AbsolutePath.EndsWith("/capture")
            ? Json(Payment("captured"))
            : Json(Payment("authorized")));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.True(result.Success);
        Assert.Equal("captured", result.RawStatus);
        Assert.Equal(2, handler.Requests.Count);
        Assert.Equal(HttpMethod.Post, handler.Requests[1].Method);
    }

    [Fact]
    public async Task Apple_pay_token_creates_a_payment_server_side()
    {
        var (provider, handler) = Create(_ => Json(Payment("paid", company: "visa")));

        var result = await provider.ChargeAsync(Request("applepay:{\"paymentData\":{\"version\":\"EC_v1\"}}"));

        Assert.True(result.Success);
        var sent = Assert.Single(handler.Requests);
        Assert.Equal(HttpMethod.Post, sent.Method);
        Assert.Equal("https://api.moyasar.com/v1/payments", sent.Uri);
        using var body = JsonDocument.Parse(sent.Body!);
        var root = body.RootElement;
        Assert.Equal(29900, root.GetProperty("amount").GetInt64());
        Assert.Equal("SAR", root.GetProperty("currency").GetString());
        Assert.Equal("applepay", root.GetProperty("source").GetProperty("type").GetString());
        Assert.Equal("{\"paymentData\":{\"version\":\"EC_v1\"}}", root.GetProperty("source").GetProperty("token").GetString());
        Assert.Equal(MoyasarPaymentProvider.GivenId("key-1").ToString(), root.GetProperty("given_id").GetString());
        Assert.Equal(CustomerId.ToString(), root.GetProperty("metadata").GetProperty("customer_id").GetString());
        Assert.Equal("p1", root.GetProperty("metadata").GetProperty("planId").GetString());
    }

    [Fact]
    public async Task Gateway_validation_error_is_a_decline()
    {
        var (provider, _) = Create(_ => Json(new { type = "invalid_request_error", message = "Invalid Apple Pay token" },
            HttpStatusCode.BadRequest));

        var result = await provider.ChargeAsync(Request("applepay:bad"));

        Assert.Equal("PAYMENT_DECLINED", result.FailureCode);
        Assert.Equal("Invalid Apple Pay token", result.FailureMessage);
    }

    [Fact]
    public async Task Rejected_credentials_are_reported_distinctly()
    {
        var (provider, _) = Create(_ => Json(new { type = "authentication_error", message = "Invalid key" },
            HttpStatusCode.Unauthorized));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_PROVIDER_AUTH_FAILED", result.FailureCode);
    }

    [Fact]
    public async Task Unknown_payment_id_is_not_found()
    {
        var (provider, _) = Create(_ => new HttpResponseMessage(HttpStatusCode.NotFound));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_NOT_FOUND", result.FailureCode);
    }

    [Fact]
    public async Task Network_failure_is_reported_as_unavailable()
    {
        var (provider, _) = Create(_ => throw new HttpRequestException("boom"));

        var result = await provider.ChargeAsync(Request(PaymentId));

        Assert.Equal("PAYMENT_PROVIDER_UNAVAILABLE", result.FailureCode);
    }

    [Theory]
    [InlineData(null, "PAYMENT_METHOD_REQUIRED")]
    [InlineData("mada", "PAYMENT_METHOD_INVALID")]
    public async Task Missing_or_invalid_method_never_calls_the_gateway(string? method, string code)
    {
        var (provider, handler) = Create(_ => throw new InvalidOperationException("must not be called"));

        var result = await provider.ChargeAsync(Request(method));

        Assert.Equal(code, result.FailureCode);
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public void Without_secret_key_the_provider_is_not_configured()
    {
        var (provider, _) = Create(_ => throw new InvalidOperationException(), secret: "");
        Assert.False(provider.IsConfigured);
    }

    [Theory]
    [InlineData(299, "SAR", 29900)]
    [InlineData(149.5, "SAR", 14950)]
    [InlineData(1.234, "KWD", 1234)]
    public void Amounts_convert_to_minor_units(decimal amount, string currency, long expected)
        => Assert.Equal(expected, MoyasarPaymentProvider.ToMinorUnits(amount, currency));

    [Fact]
    public void Sub_halala_amounts_are_rejected()
        => Assert.Throws<ArgumentException>(() => MoyasarPaymentProvider.ToMinorUnits(1.005m, "SAR"));

    [Fact]
    public void Given_id_is_stable_per_idempotency_key()
    {
        Assert.Equal(MoyasarPaymentProvider.GivenId("abc"), MoyasarPaymentProvider.GivenId("abc"));
        Assert.NotEqual(MoyasarPaymentProvider.GivenId("abc"), MoyasarPaymentProvider.GivenId("abd"));
        var uuid = Guid.NewGuid();
        Assert.Equal(uuid, MoyasarPaymentProvider.GivenId(uuid.ToString()));
    }

    [Fact]
    public void Factory_selects_moyasar_from_configuration()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PAYMENT_PROVIDER"] = "Moyasar",
            ["PAYMENT_SECRET"] = "sk_test_abc",
        }).Build();
        var factory = new PaymentProviderFactory(config, NullLoggerFactory.Instance, new StubHttpClientFactory());

        var provider = factory.GetProvider();

        Assert.Equal("moyasar", provider.Name);
        Assert.True(provider.IsConfigured);
    }

    private sealed record SentRequest(HttpMethod Method, string Uri, string? AuthScheme, string? AuthParameter, string? Body);

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<SentRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            Requests.Add(new SentRequest(request.Method, request.RequestUri!.ToString(),
                request.Headers.Authorization?.Scheme, request.Headers.Authorization?.Parameter, body));
            return respond(request);
        }
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}
