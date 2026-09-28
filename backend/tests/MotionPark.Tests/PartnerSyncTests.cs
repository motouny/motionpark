using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Account;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Infrastructure.Jobs;

namespace MotionPark.Tests;

public class PartnerSyncTests
{
    [Fact]
    public async Task Profile_name_change_queues_one_partner_update()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var handler = new UpdateProfileHandler(db);

        await handler.Handle(new UpdateProfileCommand(userId, "Sara Updated", null, null, null, null), CancellationToken.None);
        await handler.Handle(new UpdateProfileCommand(userId, "Sara Again", null, null, null, null), CancellationToken.None);

        var job = Assert.Single(await db.OdooSyncJobs.ToListAsync());
        Assert.Equal(SyncJobType.PartnerSync, job.JobType);
        Assert.Contains(customer.Id.ToString(), job.Payload);
        Assert.Contains("\"update\":true", job.Payload);
    }

    [Fact]
    public async Task Language_only_change_does_not_touch_odoo()
    {
        await using var db = TestFactory.NewDbContext();
        var (_, userId) = await TestDataBuilder.CreateCustomerAsync(db);

        await new UpdateProfileHandler(db).Handle(new UpdateProfileCommand(userId, null, null, "en", null, null), CancellationToken.None);

        Assert.Empty(await db.OdooSyncJobs.ToListAsync());
    }

    [Fact]
    public async Task Update_job_writes_current_details_to_the_mapped_partner()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, _) = await TestDataBuilder.CreateCustomerAsync(db);
        var odoo = new FakeOdooClient();
        await OdooPartnerSync.SyncAsync(customer.Id, update: false, db, odoo, CancellationToken.None);
        customer.Name = "New Name";
        await db.SaveChangesAsync();

        await OdooPartnerSync.SyncAsync(customer.Id, update: true, db, odoo, CancellationToken.None);

        Assert.Equal(1, odoo.PartnerCreateCount);
        var (partnerId, fields) = Assert.Single(odoo.PartnerUpdates);
        Assert.Equal(customer.OdooPartnerId, partnerId);
        Assert.Equal("New Name", fields["name"]);
    }

    [Fact]
    public async Task Update_job_before_the_partner_exists_creates_it()
    {
        await using var db = TestFactory.NewDbContext();
        var (customer, _) = await TestDataBuilder.CreateCustomerAsync(db);
        var odoo = new FakeOdooClient();

        await OdooPartnerSync.SyncAsync(customer.Id, update: true, db, odoo, CancellationToken.None);

        Assert.Equal(1, odoo.PartnerCreateCount);
        Assert.Empty(odoo.PartnerUpdates);
        Assert.Single(await db.OdooMappings.Where(m => m.EntityType == "Customer").ToListAsync());
    }
}
