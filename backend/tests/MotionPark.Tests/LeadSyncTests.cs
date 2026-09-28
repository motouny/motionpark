using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Cms;
using MotionPark.Infrastructure.Jobs;

namespace MotionPark.Tests;

public class LeadSyncTests
{
    [Fact]
    public async Task Trial_lead_gets_a_readable_title_and_its_real_type()
    {
        await using var db = TestFactory.NewDbContext();
        var lead = new Lead
        {
            Name = "Sara", Phone = PhoneNormalizer.NormalizeLoose("0550000000"), Type = LeadType.Trial,
            Message = "Activity of interest: السباحة",
        };
        db.Leads.Add(lead);
        await db.SaveChangesAsync();
        var odoo = new FakeOdooClient();

        await OdooLeadSync.SyncAsync(lead.Id, db, odoo, CancellationToken.None);

        var vals = Assert.Single(odoo.LeadPayloads);
        Assert.Equal("طلب تجربة — السباحة — Sara", vals["name"]);
        Assert.Equal("trial", vals["lead_type"]);
        Assert.False(vals.ContainsKey("partner_id"));
        Assert.False(vals.ContainsKey("external_uuid"));
        Assert.Equal("2001", lead.OdooLeadId);
    }

    [Fact]
    public async Task Lead_from_a_synced_customer_links_the_partner()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, _) = await TestDataBuilder.CreateCustomerAsync(db, "0561234567");
        customer.OdooPartnerId = "17";
        var lead = new Lead { Name = "Test Customer", Phone = PhoneNormalizer.NormalizeLoose("0561234567"), Type = LeadType.Contact };
        db.Leads.Add(lead);
        await db.SaveChangesAsync();
        var odoo = new FakeOdooClient();

        await OdooLeadSync.SyncAsync(lead.Id, db, odoo, CancellationToken.None);

        var vals = Assert.Single(odoo.LeadPayloads);
        Assert.Equal(17, vals["partner_id"]);
        Assert.Equal("contact", vals["lead_type"]);
        Assert.Equal("رسالة تواصل — Test Customer", vals["name"]);
    }

    [Fact]
    public async Task Lead_from_an_unsynced_customer_matches_by_email_and_uuid()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, _) = await TestDataBuilder.CreateCustomerAsync(db);
        var lead = new Lead { Name = "X", Email = "Customer@MotionPark.local", Type = LeadType.Callback };
        db.Leads.Add(lead);
        await db.SaveChangesAsync();
        var odoo = new FakeOdooClient();

        await OdooLeadSync.SyncAsync(lead.Id, db, odoo, CancellationToken.None);

        var vals = Assert.Single(odoo.LeadPayloads);
        Assert.Equal(customer.Id.ToString(), vals["external_uuid"]);
        Assert.False(vals.ContainsKey("partner_id"));
    }
}
