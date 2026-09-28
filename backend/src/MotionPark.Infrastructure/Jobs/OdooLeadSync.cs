using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Cms;

namespace MotionPark.Infrastructure.Jobs;

/// <summary>
/// LeadSync job: creates the crm.lead with a readable title ("طلب تجربة — السباحة — Sara"), the lead's
/// real type, and a link to the contact when the lead's phone or email belongs to a registered customer.
/// </summary>
public static class OdooLeadSync
{
    /// <summary>Prefix the start-today modal writes before the chosen activity.</summary>
    public const string ActivityPrefix = "Activity of interest:";

    public static async Task SyncAsync(Guid leadId, IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var lead = await db.Leads.FirstAsync(x => x.Id == leadId, ct);
        if (!string.IsNullOrWhiteSpace(lead.OdooLeadId)) return;

        var vals = new Dictionary<string, object?>
        {
            ["external_reference"] = lead.Id.ToString(),
            ["name"] = Title(lead),
            ["lead_type"] = OdooType(lead.Type),
            ["mobile"] = lead.Phone ?? string.Empty,
            ["email"] = lead.Email ?? string.Empty,
            ["description"] = lead.Message ?? string.Empty,
        };

        var customer = await FindCustomerAsync(lead, db, ct);
        if (customer is not null)
        {
            // Mapped partner id when the customer is already synced; otherwise Odoo matches on the customer UUID.
            if (int.TryParse(customer.OdooPartnerId, out var partnerId)) vals["partner_id"] = partnerId;
            else vals["external_uuid"] = customer.Id.ToString();
        }

        lead.OdooLeadId = await odoo.CreateCrmLeadAsync(vals, ct)
            ?? throw new OdooUnavailableException("CRM lead create returned no id.");
        await db.SaveChangesAsync(ct);
    }

    public static string Title(Lead lead)
    {
        var parts = new List<string> { TypeLabel(lead.Type) };
        var activity = Activity(lead.Message);
        if (activity is not null) parts.Add(activity);
        parts.Add(lead.Name);
        return string.Join(" — ", parts);
    }

    private static string? Activity(string? message)
    {
        if (message is null || !message.StartsWith(ActivityPrefix, StringComparison.OrdinalIgnoreCase)) return null;
        var activity = message[ActivityPrefix.Length..].Trim();
        return activity.Length == 0 ? null : activity;
    }

    private static string TypeLabel(LeadType type) => type switch
    {
        LeadType.Trial => "طلب تجربة",
        LeadType.Callback => "طلب اتصال",
        LeadType.MembershipInterest => "اهتمام بعضوية",
        _ => "رسالة تواصل",
    };

    private static string OdooType(LeadType type) => type switch
    {
        LeadType.Trial => "trial",
        LeadType.Callback => "callback",
        LeadType.MembershipInterest => "membership_interest",
        _ => "contact",
    };

    private static async Task<Domain.Customers.Customer?> FindCustomerAsync(Lead lead, IApplicationDbContext db, CancellationToken ct)
    {
        var phone = string.IsNullOrWhiteSpace(lead.Phone) ? null : lead.Phone;
        var email = string.IsNullOrWhiteSpace(lead.Email) ? null : lead.Email.Trim().ToLower();
        if (phone is null && email is null) return null;
        return await db.Customers
            .Where(c => (phone != null && c.Phone == phone) || (email != null && c.Email != null && c.Email.ToLower() == email))
            .OrderByDescending(c => c.OdooPartnerId != null)
            .FirstOrDefaultAsync(ct);
    }
}
