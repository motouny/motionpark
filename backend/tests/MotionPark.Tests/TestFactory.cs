using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Bookings;
using MotionPark.Domain.Catalog;
using MotionPark.Domain.Customers;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Membership;
using MotionPark.Infrastructure.Auth;
using MotionPark.Infrastructure.Payments;
using MotionPark.Infrastructure.Persistence;

namespace MotionPark.Tests;

/// <summary>EF InMemory context factory + fakes shared by handler tests.</summary>
public static class TestFactory
{
    public static MotionParkDbContext NewDbContext()
    {
        var options = new DbContextOptionsBuilder<MotionParkDbContext>()
            .UseInMemoryDatabase($"motionpark-{Guid.NewGuid():N}")
            .Options;
        return new MotionParkDbContext(options);
    }

    public static IConfiguration NewConfig(Dictionary<string, string?>? extra = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["JWT_SECRET"] = "test-secret-key-with-enough-entropy-for-hmac-sha256-signing!!",
            ["JWT_ISSUER"] = "motionpark",
            ["JWT_AUDIENCE"] = "motionpark",
            ["JWT_ACCESS_TOKEN_MINUTES"] = "15",
            ["JWT_REFRESH_TOKEN_DAYS"] = "30",
        };
        if (extra is not null) foreach (var (k, v) in extra) values[k] = v;
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }
}

public sealed class FakeLockProvider : ILockProvider
{
    public int AcquireCount;
    public Task<IAsyncDisposable?> TryAcquireAsync(string key, TimeSpan ttl, CancellationToken ct = default)
    {
        AcquireCount++;
        return Task.FromResult<IAsyncDisposable?>(new NoopLock());
    }
    private sealed class NoopLock : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}

public sealed class FakeNotificationService : INotificationService
{
    public List<(Guid? UserId, string Type)> Sent = [];
    public Task NotifyAsync(Guid? userId, string type, string titleAr, string titleEn,
        string? bodyAr = null, string? bodyEn = null, NotificationChannel channel = NotificationChannel.InApp,
        object? data = null, CancellationToken ct = default)
    {
        Sent.Add((userId, type));
        return Task.CompletedTask;
    }
}

public sealed class FakeOdooClient : IOdooClient
{
    public bool Reachable { get; set; } = true;
    public int PartnerCreateCount { get; set; }
    public Task<long> AuthenticateAsync(CancellationToken ct = default) => Task.FromResult(Reachable ? 1L : -1L);
    public Task<bool> PingAsync(CancellationToken ct = default) => Task.FromResult(Reachable);
    public Task<IReadOnlyList<Dictionary<string, object?>>> GetMembershipProductsAsync(CancellationToken ct = default)
        => Reachable
            ? Task.FromResult<IReadOnlyList<Dictionary<string, object?>>>([StubOdooPayloads.TwoPlans[0]])
            : throw new OdooUnavailableException("Odoo down");
    public Task<string?> CreatePartnerAsync(Dictionary<string, object?> fields, CancellationToken ct = default)
    {
        if (!Reachable) throw new OdooUnavailableException("Odoo down");
        PartnerCreateCount++;
        return Task.FromResult<string?>($"100{PartnerCreateCount}");
    }
    public List<Dictionary<string, object?>> SubscriptionPayloads { get; } = [];
    public List<Dictionary<string, object?>> PaymentPayloads { get; } = [];
    public bool FailPaymentRegistration { get; set; }

    // Mirrors motionpark_api.create_subscription's reply shape.
    public Task<Dictionary<string, object?>?> CreateSubscriptionAsync(Dictionary<string, object?> payload, CancellationToken ct = default)
    {
        if (!Reachable) throw new OdooUnavailableException("Odoo down");
        SubscriptionPayloads.Add(payload);
        return Task.FromResult<Dictionary<string, object?>?>(new Dictionary<string, object?>
            { ["id"] = 777, ["name"] = "SUB/0001", ["status"] = "pending_payment", ["created"] = true });
    }

    public Task<string?> RegisterPaymentAsync(Dictionary<string, object?> vals, CancellationToken ct = default)
    {
        if (!Reachable || FailPaymentRegistration) throw new OdooUnavailableException("Odoo down");
        PaymentPayloads.Add(vals);
        return Task.FromResult<string?>("501");
    }
    public Task<string?> CreateCrmLeadAsync(Dictionary<string, object?> fields, CancellationToken ct = default)
        => Reachable ? Task.FromResult<string?>("2001") : throw new OdooUnavailableException("Odoo down");
}

public sealed class FakePaymentProvider(bool configured, bool succeeds = true) : IPaymentProvider
{
    public string Name => configured ? (succeeds ? "mock" : "mock-failing") : "not-configured";
    public bool IsConfigured => configured;
    public int ChargeCount { get; private set; }
    public Task<PaymentChargeResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct = default)
    {
        ChargeCount++;
        return Task.FromResult(succeeds
            ? new PaymentChargeResult(true, $"ref_{ChargeCount}", null, null, "captured")
            : new PaymentChargeResult(false, null, "CARD_DECLINED", "Declined", "failed"));
    }
}

public sealed class FakePaymentProviderFactory(IPaymentProvider provider) : IPaymentProviderFactory
{
    public IPaymentProvider GetProvider() => provider;
}

public sealed class FakeCurrentUser : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public string? Email => "test@motionpark.local";
    public string? Phone => "+966500000002";
    public IReadOnlyCollection<string> Roles => [];
    public bool IsInRole(string role) => false;
    public bool IsAuthenticated => UserId is not null;
    public string? IpAddress => "127.0.0.1";
}

public static class TestDataBuilder
{
    public static async Task<(Customer Customer, Guid UserId)> CreateCustomerAsync(MotionParkDbContext db, string phone = "0561234567")
    {
        var user = new User
        {
            Name = "Test Customer", Email = "customer@motionpark.local",
            NormalizedEmail = "CUSTOMER@MOTIONPARK.LOCAL", Phone = PhoneNormalizer.Normalize(phone)!,
            PreferredLanguage = "ar",
        };
        user.PasswordHash = new Microsoft.AspNetCore.Identity.PasswordHasher<User>().HashPassword(user, "Passw0rd123");
        db.Users.Add(user);
        var customer = new Customer { UserId = user.Id, Name = user.Name, Phone = user.Phone, Email = user.Email };
        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        return (customer, user.Id);
    }

    public static async Task<MembershipPlanReadModel> CreatePlanAsync(MotionParkDbContext db,
        string slug = "motion-plus", int sessionLimit = 0)
    {
        var plan = new MembershipPlanReadModel
        {
            Slug = slug, NameAr = slug, NameEn = slug, Price = 499, Vat = 15,
            Duration = 1, DurationUnit = "month", SessionLimit = sessionLimit,
            Active = true, SortOrder = 1, Source = "seed", IsConfigurablePlaceholder = true,
        };
        db.MembershipPlanReadModels.Add(plan);
        await db.SaveChangesAsync();
        return plan;
    }

    public static async Task<CustomerMembership> CreateActiveMembershipAsync(MotionParkDbContext db,
        Customer customer, MembershipPlanReadModel plan)
    {
        var membership = new CustomerMembership
        {
            CustomerId = customer.Id, MembershipPlanId = plan.Id,
            Status = SubscriptionStatus.Active,
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow.AddMonths(1),
            BillingCycle = BillingCycle.Monthly,
            RemainingSessions = plan.SessionLimit > 0 ? plan.SessionLimit : null,
        };
        db.CustomerMemberships.Add(membership);
        await db.SaveChangesAsync();
        return membership;
    }

    public static async Task<ClassSchedule> CreateScheduleAsync(MotionParkDbContext db,
        DateOnly? date = null, TimeOnly? start = null, TimeOnly? end = null, int capacity = 2)
    {
        var branch = new Branch { Slug = $"b-{Guid.NewGuid():N}", NameAr = "فرع", NameEn = "Branch", City = "Riyadh" };
        var activity = new Activity { Slug = $"a-{Guid.NewGuid():N}", NameAr = "نشاط", NameEn = "Activity" };
        db.Branches.Add(branch);
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        var schedule = new ClassSchedule
        {
            BranchId = branch.Id, ActivityId = activity.Id,
            Date = date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            StartTime = start ?? new TimeOnly(10, 0),
            EndTime = end ?? new TimeOnly(11, 0),
            Capacity = capacity, GenderScope = GenderScope.Female,
        };
        db.ClassSchedules.Add(schedule);
        await db.SaveChangesAsync();
        return schedule;
    }
}

public static class StubOdooPayloads
{
    public static readonly List<Dictionary<string, object?>> TwoPlans =
    [
        new()
        {
            ["id"] = 12, ["slug"] = "motion-plus", ["name_ar"] = "موشن بلس", ["name_en"] = "Motion Plus",
            ["price"] = 499.0, ["vat"] = 15.0, ["duration"] = 1, ["duration_unit"] = "month",
            ["session_limit"] = 0, ["active"] = true,
        },
        new()
        {
            ["id"] = 13, ["slug"] = "park-signature", ["name_en"] = "Park Signature",
            ["price"] = 799.0, ["vat"] = 15.0, ["duration"] = 1, ["duration_unit"] = "month",
            ["session_limit"] = 8, ["active"] = true,
        },
    ];
}
