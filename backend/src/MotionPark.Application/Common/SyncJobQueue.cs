using Microsoft.EntityFrameworkCore;
using MotionPark.Domain;

namespace MotionPark.Application.Common;

/// <summary>Recovery operations for the Odoo sync-job queue.</summary>
public static class SyncJobQueue
{
    public static readonly TimeSpan StuckAfter = TimeSpan.FromMinutes(15);

    /// <summary>
    /// A job left in Processing (the API restarted mid-job, or saving its outcome failed) is never picked up
    /// again by the worker. Put it back in the queue; the processors are idempotent.
    /// </summary>
    public static async Task<int> RequeueStuckAsync(IApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        var cutoff = now - StuckAfter;
        var stuck = await db.OdooSyncJobs
            .Where(j => j.Status == IntegrationStatus.Processing && (j.UpdatedAt == null || j.UpdatedAt < cutoff))
            .ToListAsync(ct);
        foreach (var job in stuck)
        {
            job.Status = IntegrationStatus.Pending;
            job.NextAttemptAt = now;
            job.UpdatedAt = now;
            job.LastError ??= "Interrupted while processing; requeued.";
        }
        if (stuck.Count > 0) await db.SaveChangesAsync(ct);
        return stuck.Count;
    }

    /// <summary>Admin "retry failed": jobs reach Error only after using all attempts, so give them a fresh set.</summary>
    public static async Task<int> RequeueFailedAsync(IApplicationDbContext db, DateTime now, CancellationToken ct)
    {
        var failed = await db.OdooSyncJobs.Where(j => j.Status == IntegrationStatus.Error).ToListAsync(ct);
        foreach (var job in failed)
        {
            job.Status = IntegrationStatus.Pending;
            job.Attempts = 0;
            job.NextAttemptAt = now;
            job.UpdatedAt = now;
        }
        if (failed.Count > 0) await db.SaveChangesAsync(ct);
        return failed.Count;
    }
}
