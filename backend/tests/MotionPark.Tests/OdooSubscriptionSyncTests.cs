using System.Net;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MotionPark.Application.Subscriptions;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Infrastructure.Jobs;
using MotionPark.Infrastructure.Odoo;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

public class OdooSubscriptionSyncTests
{
    private static async Task<(MotionParkDbContext Db, Guid MembershipId, string Key)> PaidSubscriptionAsync(int? odooProductId = 42)
    {
        var db = TestFactory.NewDbContext();
        var (_, userId) = await TestDataBuilder.CreateCustomerAsync(db);
        var plan = await TestDataBuilder.CreatePlanAsync(db);
        plan.OdooProductId = odooProductId;
        await db.SaveChangesAsync();

        const string key = "key-odoo-1";
        var dto = await new CreateSubscriptionHandler(db, new FakePaymentProviderFactory(new FakePaymentProvider(configured: true)),
                new FakeNotificationService(), new CreateSubscriptionValidator())
            .Handle(new CreateSubscriptionCommand(userId, plan.Id, null, "pay_1", key), CancellationToken.None);
        return (db, dto.Id, key);
    }

    [Fact]
    public async Task Subscription_is_sent_with_the_fields_odoo_create_subscription_reads()
    {
        var (db, membershipId, key) = await PaidSubscriptionAsync();
        await using var _ = db;
        var odoo = new FakeOdooClient();

        await OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None);

        // erp/custom-addons/motionpark_api/models/motionpark_api.py create_subscription reads these keys.
        var sent = Assert.Single(odoo.SubscriptionPayloads);
        Assert.Equal(key, sent["external_reference"]);
        Assert.Equal(42, sent["product_id"]);
        var partner = Assert.IsType<Dictionary<string, object?>>(sent["partner"]);
        var customer = await db.Customers.SingleAsync();
        Assert.Equal(customer.Id.ToString(), partner["external_uuid"]);
        Assert.Equal(customer.Phone, partner["mobile"]);

        var membership = await db.CustomerMemberships.SingleAsync();
        Assert.Equal(SubscriptionStatus.Active, membership.Status);
        Assert.Equal("777", membership.OdooSubscriptionId);
    }

    [Fact]
    public async Task Successful_payment_is_registered_against_the_odoo_subscription()
    {
        var (db, membershipId, key) = await PaidSubscriptionAsync();
        await using var _ = db;
        var odoo = new FakeOdooClient();

        await OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None);

        // motionpark_payment_sync register_payment: status "success" marks the subscription paid and active.
        var payment = await db.Payments.SingleAsync();
        var sent = Assert.Single(odoo.PaymentPayloads);
        Assert.Equal(payment.Id.ToString(), sent["external_uuid"]);
        Assert.Equal(777, sent["subscription_id"]);
        Assert.Equal((double)payment.Amount, sent["amount"]);
        Assert.Equal("success", sent["status"]);
        Assert.Equal("ref_1", sent["reference"]);
        Assert.Equal("mock", sent["provider"]);
    }

    [Fact]
    public async Task Retry_after_payment_registration_failed_does_not_recreate_the_subscription()
    {
        var (db, membershipId, key) = await PaidSubscriptionAsync();
        await using var _ = db;
        var odoo = new FakeOdooClient { FailPaymentRegistration = true };

        await Assert.ThrowsAsync<MotionPark.Application.Abstractions.OdooUnavailableException>(() =>
            OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None));
        Assert.Equal(SubscriptionStatus.PendingPayment, (await db.CustomerMemberships.SingleAsync()).Status);

        odoo.FailPaymentRegistration = false;
        var activated = await OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None);
        var again = await OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None);

        Assert.True(activated);
        Assert.False(again);
        Assert.Single(odoo.SubscriptionPayloads);
        Assert.Single(odoo.PaymentPayloads);
        Assert.Equal(2, await db.OdooMappings.CountAsync());
    }

    [Fact]
    public async Task Plan_without_odoo_product_fails_clearly_instead_of_sending_a_bad_request()
    {
        var (db, membershipId, key) = await PaidSubscriptionAsync(odooProductId: null);
        await using var _ = db;
        var odoo = new FakeOdooClient();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            OdooSubscriptionSync.SyncAsync(membershipId, key, db, odoo, CancellationToken.None));

        Assert.Contains("no Odoo product", ex.Message);
        Assert.Empty(odoo.SubscriptionPayloads);
    }

    [Fact]
    public async Task Xml_rpc_passes_vals_as_the_single_positional_argument()
    {
        var bodies = new List<string>();
        var handler = new XmlHandler(async req =>
        {
            var body = await req.Content!.ReadAsStringAsync();
            bodies.Add(body);
            return body.Contains("<methodName>login</methodName>")
                ? "<methodResponse><params><param><value><int>2</int></value></param></params></methodResponse>"
                : "<methodResponse><params><param><value><struct><member><name>id</name><value><int>9</int></value></member></struct></value></param></params></methodResponse>";
        });
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ODOO_URL"] = "http://odoo.test", ["ODOO_PASSWORD"] = "x",
        }).Build();
        var client = new XmlRpcOdooClient(new HttpClient(handler), config, NullLogger<XmlRpcOdooClient>.Instance);

        await client.CreateSubscriptionAsync(new Dictionary<string, object?> { ["external_reference"] = "k" });
        var paymentId = await client.RegisterPaymentAsync(new Dictionary<string, object?> { ["external_uuid"] = "p" });

        Assert.Equal("9", paymentId);
        foreach (var body in bodies.Where(b => b.Contains("execute_kw")))
        {
            // execute_kw(db, uid, password, model, method, args, kwargs): args must be [ {vals} ], not [ [ {vals} ] ].
            var args = XDocument.Parse(body).Descendants("param").ElementAt(5).Element("value")!.Element("array")!;
            var first = args.Element("data")!.Element("value")!.Elements().Single();
            Assert.Equal("struct", first.Name.LocalName);
        }
        Assert.Equal(2, bodies.Count(b => b.Contains("execute_kw")));
    }

    private sealed class XmlHandler(Func<HttpRequestMessage, Task<string>> respond) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            => new(HttpStatusCode.OK) { Content = new StringContent(await respond(request), Encoding.UTF8, "text/xml") };
    }
}
