using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain.Integrations;

namespace MotionPark.Infrastructure.Jobs;

/// <summary>
/// PartnerSync job: the first run creates (or matches) the customer's res.partner and records the mapping;
/// a run queued by a profile update (<c>update: true</c>) writes the current name, email and phone to the
/// mapped partner, since find_or_create_partner only fills fields that are empty in Odoo.
/// </summary>
public static class OdooPartnerSync
{
    public const string CustomerEntity = "Customer";

    public static async Task SyncAsync(Guid customerId, bool update, IApplicationDbContext db, IOdooClient odoo, CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer is null) return;

        var fields = new Dictionary<string, object?>
        {
            ["name"] = customer.Name,
            ["mobile"] = customer.Phone,
            ["email"] = customer.Email ?? string.Empty,
        };

        var mapping = await db.OdooMappings.FirstOrDefaultAsync(
            m => m.EntityType == CustomerEntity && m.LocalId == customerId, ct);
        if (mapping is not null)
        {
            if (update) await odoo.UpdatePartnerAsync(mapping.OdooId, fields, ct);
            return;
        }

        fields["ref"] = customer.Id.ToString(); // idempotency key on the Odoo side
        var odooId = await odoo.CreatePartnerAsync(fields, ct);
        if (string.IsNullOrWhiteSpace(odooId))
            throw new OdooUnavailableException("Partner create returned no id.");

        customer.OdooPartnerId = odooId;
        db.OdooMappings.Add(new OdooMapping
        {
            EntityType = CustomerEntity,
            LocalId = customer.Id,
            OdooId = odooId,
            OdooModel = "res.partner",
        });
        await db.SaveChangesAsync(ct);
    }
}
