using System.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MotionPark.Application.Abstractions;

namespace MotionPark.Infrastructure.Odoo;

/// <summary>
/// Typed Odoo XML-RPC client (common.login + object.execute_kw) over System.Net.Http.
/// Hand-rolled XML-RPC keeps net8 clean of legacy CookComputing dependencies.
/// Timeout + exponential-backoff retry; faults and auth failures never crash callers —
/// they surface as <see cref="OdooUnavailableException"/> so integrations degrade gracefully.
/// </summary>
public sealed class XmlRpcOdooClient : IOdooClient
{
    private readonly HttpClient _http;
    private readonly ILogger<XmlRpcOdooClient> _logger;
    private readonly string _url;
    private readonly string _database;
    private readonly string _username;
    private readonly string _password;
    private readonly int _timeoutSeconds;
    private readonly int _retryCount;

    public XmlRpcOdooClient(HttpClient http, IConfiguration config, ILogger<XmlRpcOdooClient> logger)
    {
        _http = http;
        _logger = logger;
        _url = (config["ODOO_URL"] ?? "http://127.0.0.1:8069").TrimEnd('/');
        _database = config["ODOO_DATABASE"] ?? "motionpark_odoo";
        _username = config["ODOO_USERNAME"] ?? "admin";
        _password = config["ODOO_PASSWORD"] ?? string.Empty;
        _timeoutSeconds = int.TryParse(config["ODOO_XMLRPC_TIMEOUT_SECONDS"], out var t) ? t : 30;
        _retryCount = int.TryParse(config["ODOO_XMLRPC_RETRY_COUNT"], out var r) ? Math.Max(1, r) : 3;
        _http.Timeout = TimeSpan.FromSeconds(_timeoutSeconds);
    }

    public async Task<long> AuthenticateAsync(CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_password)) return -1;
        try
        {
            var result = await CallWithRetryAsync("common", "login",
                [_database, _username, _password], ct);
            return result switch
            {
                int i => i,
                long l => l,
                _ => -1,
            };
        }
        catch (Exception ex) when (ex is not XmlRpcFaultException)
        {
            _logger.LogDebug(ex, "Odoo authentication failed");
            return -1;
        }
        catch (XmlRpcFaultException)
        {
            return -1;
        }
    }

    public async Task<bool> PingAsync(CancellationToken ct = default)
        => await AuthenticateAsync(ct) > 0;

    public async Task<IReadOnlyList<Dictionary<string, object?>>> GetMembershipProductsAsync(CancellationToken ct = default)
    {
        var result = await ExecuteKwAsync("motionpark.api", "get_membership_products",
            [], new Dictionary<string, object?>(), ct);
        if (result is not System.Collections.IEnumerable seq || result is string)
            return [];
        return seq.Cast<object?>()
            .OfType<Dictionary<string, object?>>()
            .ToList();
    }

    public async Task<string?> CreatePartnerAsync(Dictionary<string, object?> fields, CancellationToken ct = default)
    {
        var uuid = fields.TryGetValue("ref", out var r) ? r?.ToString() : null;
        var name = fields.TryGetValue("name", out var n) && n is not null ? n.ToString()! : "MotionPark Customer";
        var email = fields.TryGetValue("email", out var e) ? e?.ToString() : null;
        var mobile = fields.TryGetValue("mobile", out var mo) ? mo?.ToString() : null;

        // Idempotent create via the Motion Park Odoo helper: matches on
        // external platform UUID -> normalized mobile -> email (never name-only),
        // and maps mobile -> res.partner.phone (Odoo 19 has no `mobile` field).
        var vals = new Dictionary<string, object?>
        {
            ["name"] = name,
            ["external_uuid"] = uuid ?? string.Empty,
            ["email"] = email ?? string.Empty,
            ["mobile"] = mobile ?? string.Empty,
            ["lang"] = "ar_SY",
        };
        var result = await ExecuteKwAsync("motionpark.customer.sync", "find_or_create_partner",
            [vals], new Dictionary<string, object?>(), ct);
        if (result is Dictionary<string, object?> d && d.TryGetValue("id", out var id) && id is not null)
            return id.ToString();
        return null;
    }

    public async Task<Dictionary<string, object?>?> CreateSubscriptionAsync(
        Dictionary<string, object?> payload, CancellationToken ct = default)
    {
        var result = await ExecuteKwAsync("motionpark.api", "create_subscription",
            [new object?[] { payload }], new Dictionary<string, object?>(), ct);
        return result as Dictionary<string, object?>;
    }

    public async Task<string?> CreateCrmLeadAsync(Dictionary<string, object?> fields, CancellationToken ct = default)
    {
        var created = await ExecuteKwAsync("crm.lead", "create", [fields],
            new Dictionary<string, object?>(), ct);
        return created?.ToString();
    }

    private async Task<object?> ExecuteKwAsync(string model, string method, object?[] args,
        Dictionary<string, object?> kwargs, CancellationToken ct)
    {
        var uid = await AuthenticateAsync(ct);
        if (uid <= 0)
            throw new OdooUnavailableException("Odoo authentication failed — check ODOO_USERNAME/ODOO_PASSWORD.");

        return await CallWithRetryAsync("object", "execute_kw",
            [_database, uid, _password, model, method, args, kwargs], ct);
    }

    private async Task<object?> CallWithRetryAsync(string endpoint, string method, object?[] args, CancellationToken ct)
    {
        Exception? last = null;
        for (var attempt = 1; attempt <= _retryCount; attempt++)
        {
            try
            {
                var body = XmlRpc.BuildMethodCall(method, args);
                using var request = new HttpRequestMessage(HttpMethod.Post, $"{_url}/xmlrpc/2/{endpoint}")
                {
                    Content = new StringContent(body, System.Text.Encoding.UTF8, "text/xml"),
                };
                using var response = await _http.SendAsync(request, ct);
                if ((int)response.StatusCode >= 500)
                    throw new HttpRequestException($"Odoo returned HTTP {(int)response.StatusCode}");
                response.EnsureSuccessStatusCode();
                var xml = await response.Content.ReadAsStringAsync(ct);
                return XmlRpc.ParseResponse(xml);
            }
            catch (XmlRpcFaultException)
            {
                throw;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException or IOException or WebException)
            {
                last = ex;
                _logger.LogDebug(ex, "Odoo XML-RPC attempt {Attempt}/{Max} failed", attempt, _retryCount);
                if (attempt < _retryCount)
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), ct);
            }
        }
        throw new OdooUnavailableException($"Odoo XML-RPC call '{method}' failed after {_retryCount} attempts.", last);
    }
}
