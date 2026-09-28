namespace MotionPark.Application.Abstractions;

/// <summary>
/// Typed Odoo XML-RPC client. All methods are fault-tolerant at the caller level:
/// implementations throw <see cref="OdooUnavailableException"/> on failure and never leak secrets.
/// </summary>
public interface IOdooClient
{
    /// <summary>Authenticates and returns the Odoo uid, or -1 on failure. Never throws for auth failure.</summary>
    Task<long> AuthenticateAsync(CancellationToken ct = default);

    /// <summary>Reachability + auth probe used by health checks and test-connection.</summary>
    Task<bool> PingAsync(CancellationToken ct = default);

    /// <summary>Returns motionpark.api get_membership_products payload as raw XML-RPC value dictionaries.</summary>
    Task<IReadOnlyList<Dictionary<string, object?>>> GetMembershipProductsAsync(CancellationToken ct = default);

    /// <summary>Creates (or matches) a res.partner. Returns the Odoo id, or null on failure.</summary>
    Task<string?> CreatePartnerAsync(Dictionary<string, object?> fields, CancellationToken ct = default);

    /// <summary>Writes changed profile fields (name, email, phone) to an existing res.partner.</summary>
    Task UpdatePartnerAsync(string partnerId, Dictionary<string, object?> fields, CancellationToken ct = default);

    /// <summary>Creates a subscription via motionpark.api.create_subscription. Returns result dict or null on failure.</summary>
    Task<Dictionary<string, object?>?> CreateSubscriptionAsync(Dictionary<string, object?> payload, CancellationToken ct = default);

    /// <summary>Registers a platform payment via motionpark.payment.transaction.register_payment (idempotent on external_uuid).
    /// A "success" payment marks the linked Odoo subscription paid and active. Returns the Odoo transaction id.</summary>
    Task<string?> RegisterPaymentAsync(Dictionary<string, object?> vals, CancellationToken ct = default);

    /// <summary>Creates a CRM lead. Returns the Odoo id, or null on failure.</summary>
    Task<string?> CreateCrmLeadAsync(Dictionary<string, object?> fields, CancellationToken ct = default);
}

public sealed class OdooUnavailableException(string message, Exception? inner = null) : Exception(message, inner);
