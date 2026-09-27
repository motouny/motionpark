using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;

namespace MotionPark.Application.Memberships;

public record PlanSyncResult(int Upserted, int Deactivated, bool OdooReachable, string? Error);

public record SyncMembershipPlansCommand(bool EnqueueOnly = false) : IRequest<PlanSyncResult>;

/// <summary>Auth-aware alias of the public membership plans feed (serves the read model only).</summary>
public record GetMembershipPlansQuery : IRequest<IReadOnlyList<Dtos.MembershipPlanDto>>;

public sealed class GetMembershipPlansHandler(IApplicationDbContext db)
    : IRequestHandler<GetMembershipPlansQuery, IReadOnlyList<Dtos.MembershipPlanDto>>
{
    public async Task<IReadOnlyList<Dtos.MembershipPlanDto>> Handle(GetMembershipPlansQuery query, CancellationToken ct)
    {
        var plans = await db.MembershipPlanReadModels
            .Where(p => p.Active)
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);
        return plans.Select(Dtos.PlanMapper.ToDto).ToList();
    }
}

/// <summary>Maps raw Odoo motionpark.api get_membership_products rows to read models. Pure & testable.</summary>
public static class MembershipPlanMapper
{
    public static List<MembershipPlanReadModel> FromOdooProducts(IEnumerable<Dictionary<string, object?>> products)
    {
        var result = new List<MembershipPlanReadModel>();
        foreach (var p in products)
        {
            var slug = Str(p, "slug");
            if (string.IsNullOrWhiteSpace(slug)) slug = Slugify(Str(p, "name_en") ?? Str(p, "name") ?? $"plan-{p.GetValueOrDefault("id")}");
            result.Add(new MembershipPlanReadModel
            {
                OdooProductId = Int(p, "id"),
                Slug = slug,
                NameAr = Str(p, "name_ar") ?? Str(p, "motionpark_name_ar") ?? Str(p, "name") ?? string.Empty,
                NameEn = Str(p, "name_en") ?? Str(p, "name") ?? string.Empty,
                DescriptionAr = Str(p, "description_ar") ?? Str(p, "motionpark_description_ar"),
                DescriptionEn = Str(p, "description_en") ?? Str(p, "motionpark_description_en"),
                Price = Decimal(p, "price") ?? Decimal(p, "list_price") ?? 0m,
                Vat = Decimal(p, "vat") ?? 15m,
                Currency = Str(p, "currency") ?? "SAR",
                Duration = Int(p, "duration") ?? Int(p, "membership_duration") ?? 1,
                DurationUnit = Str(p, "duration_unit") ?? "month",
                SessionLimit = Int(p, "session_limit") ?? 0,
                Featured = Bool(p, "featured") || Bool(p, "website_featured"),
                SortOrder = Int(p, "sort_order") ?? Int(p, "website_sort_order") ?? 0,
                Active = Bool(p, "active", defaultValue: true),
                FeaturesAr = Json.Stringify(StrArray(p, "features_ar")),
                FeaturesEn = Json.Stringify(StrArray(p, "features_en")),
                Branches = Json.Stringify(RefArray(p, "branches")),
                Activities = Json.Stringify(RefArray(p, "activities")),
                Source = "odoo",
                IsConfigurablePlaceholder = false,
            });
        }
        return result;
    }

    private static string? Str(Dictionary<string, object?> d, string key) =>
        d.TryGetValue(key, out var v) && v is string s && !string.IsNullOrWhiteSpace(s) ? s.Trim() : null;

    private static int? Int(Dictionary<string, object?> d, string key) => d.TryGetValue(key, out var v) ? v switch
    {
        int i => i,
        long l => (int)l,
        double db => (int)db,
        string s when int.TryParse(s, out var pi) => pi,
        _ => null,
    } : null;

    private static decimal? Decimal(Dictionary<string, object?> d, string key) => d.TryGetValue(key, out var v) ? v switch
    {
        double db => (decimal)db,
        float f => (decimal)f,
        int i => i,
        long l => l,
        string s when decimal.TryParse(s, out var pd) => pd,
        _ => null,
    } : null;

    private static bool Bool(Dictionary<string, object?> d, string key, bool defaultValue = false) =>
        d.TryGetValue(key, out var v) ? v switch
        {
            bool b => b,
            int i => i != 0,
            string s when bool.TryParse(s, out var pb) => pb,
            _ => defaultValue,
        } : defaultValue;

    private static IReadOnlyList<string> StrArray(Dictionary<string, object?> d, string key)
    {
        if (!d.TryGetValue(key, out var v) || v is null) return [];
        return v switch
        {
            IEnumerable<string> es => es.ToList(),
            System.Collections.IEnumerable seq => seq.Cast<object?>().Select(x => x?.ToString() ?? string.Empty).Where(s => s.Length > 0).ToList(),
            _ => [],
        };
    }

    private static IReadOnlyList<object> RefArray(Dictionary<string, object?> d, string key)
    {
        if (!d.TryGetValue(key, out var v) || v is null) return [];
        if (v is System.Collections.IEnumerable seq && v is not string)
            return seq.Cast<object?>().Where(x => x is not null).Cast<object>().ToList();
        return [];
    }

    private static string Slugify(string value)
    {
        var chars = value.ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray();
        var slug = new string(chars).Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return string.IsNullOrWhiteSpace(slug) ? $"plan-{Guid.NewGuid():N}"[..12] : slug;
    }
}

public sealed class SyncMembershipPlansHandler(IApplicationDbContext db, IOdooClient odoo)
    : IRequestHandler<SyncMembershipPlansCommand, PlanSyncResult>
{
    public const string SyncTransactionId = "membership-plan-sync";

    public async Task<PlanSyncResult> Handle(SyncMembershipPlansCommand cmd, CancellationToken ct)
    {
        if (cmd.EnqueueOnly)
        {
            if (!await db.OdooSyncJobs.AnyAsync(j => j.JobType == SyncJobType.MembershipPlanSync
                    && j.Status == IntegrationStatus.Pending && j.MotionParkTransactionId == SyncTransactionId, ct))
            {
                db.OdooSyncJobs.Add(new OdooSyncJob
                {
                    JobType = SyncJobType.MembershipPlanSync,
                    Payload = "{}",
                    MotionParkTransactionId = SyncTransactionId,
                });
                await db.SaveChangesAsync(ct);
            }
            return new PlanSyncResult(0, 0, true, null);
        }

        var job = await db.OdooSyncJobs
            .FirstOrDefaultAsync(j => j.JobType == SyncJobType.MembershipPlanSync
                && j.MotionParkTransactionId == SyncTransactionId, ct);
        job ??= new OdooSyncJob
        {
            JobType = SyncJobType.MembershipPlanSync,
            MotionParkTransactionId = SyncTransactionId,
        };
        if (job.Id == Guid.Empty) db.OdooSyncJobs.Add(job);
        job.Status = IntegrationStatus.Processing;
        job.UpdatedAt = DateTime.UtcNow;
        job.Attempts++;
        await db.SaveChangesAsync(ct);

        try
        {
            var products = await odoo.GetMembershipProductsAsync(ct);
            var mapped = MembershipPlanMapper.FromOdooProducts(products);

            var upserted = 0;
            foreach (var plan in mapped)
            {
                // Match by Odoo product id OR slug so an Odoo plan reuses (reactivates)
                // a deactivated seed-placeholder row instead of violating the slug unique index.
                var existing = await db.MembershipPlanReadModels.FirstOrDefaultAsync(
                    p => (plan.OdooProductId != null && p.OdooProductId == plan.OdooProductId)
                         || p.Slug == plan.Slug, ct);
                if (existing is null)
                {
                    plan.Id = Guid.NewGuid();
                    db.MembershipPlanReadModels.Add(plan);
                }
                else
                {
                    existing.OdooProductId = plan.OdooProductId ?? existing.OdooProductId;
                    existing.Slug = plan.Slug;
                    existing.NameAr = plan.NameAr; existing.NameEn = plan.NameEn;
                    existing.DescriptionAr = plan.DescriptionAr; existing.DescriptionEn = plan.DescriptionEn;
                    existing.Price = plan.Price; existing.Vat = plan.Vat; existing.Currency = plan.Currency;
                    existing.Duration = plan.Duration; existing.DurationUnit = plan.DurationUnit;
                    existing.SessionLimit = plan.SessionLimit;
                    existing.FeaturesAr = plan.FeaturesAr; existing.FeaturesEn = plan.FeaturesEn;
                    existing.Branches = plan.Branches; existing.Activities = plan.Activities;
                    existing.Featured = plan.Featured; existing.SortOrder = plan.SortOrder;
                    existing.Active = plan.Active;
                    existing.Source = "odoo";
                    existing.IsConfigurablePlaceholder = false;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                upserted++;
            }

            // Seed placeholders that Odoo did not return are deactivated (never deleted).
            var syncedSlugs = mapped.Select(m => m.Slug).ToHashSet();
            var staleSeeds = await db.MembershipPlanReadModels
                .Where(p => p.Source == "seed" && p.IsConfigurablePlaceholder && p.Active)
                .ToListAsync(ct);
            var deactivated = 0;
            foreach (var seed in staleSeeds.Where(s => !syncedSlugs.Contains(s.Slug)))
            {
                seed.Active = false;
                seed.UpdatedAt = DateTime.UtcNow;
                deactivated++;
            }

            job.Status = IntegrationStatus.Done;
            job.ProcessedAt = DateTime.UtcNow;
            job.LastError = null;
            db.IntegrationLogs.Add(new IntegrationLog
            {
                Direction = IntegrationDirection.Inbound,
                Entity = "MembershipPlan",
                Operation = "get_membership_products",
                Status = IntegrationStatus.Done,
                Attempt = job.Attempts,
                TransactionId = SyncTransactionId,
            });
            await db.SaveChangesAsync(ct);
            return new PlanSyncResult(upserted, deactivated, true, null);
        }
        catch (OdooUnavailableException ex)
        {
            job.Status = IntegrationStatus.Error;
            job.LastError = ex.Message;
            job.NextAttemptAt = DateTime.UtcNow.AddMinutes(Math.Pow(2, Math.Min(job.Attempts, 5)) * 2);
            db.IntegrationLogs.Add(new IntegrationLog
            {
                Direction = IntegrationDirection.Inbound,
                Entity = "MembershipPlan",
                Operation = "get_membership_products",
                Status = IntegrationStatus.Error,
                Attempt = job.Attempts,
                Error = ex.Message,
                TransactionId = SyncTransactionId,
            });
            await db.SaveChangesAsync(ct);
            throw;
        }
    }
}
