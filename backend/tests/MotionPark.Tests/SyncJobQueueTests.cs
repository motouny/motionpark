using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Common;
using MotionPark.Domain;
using MotionPark.Domain.Integrations;

namespace MotionPark.Tests;

public class SyncJobQueueTests
{
    private static readonly DateTime Now = new(2026, 9, 27, 20, 0, 0, DateTimeKind.Utc);

    [Fact]
    public async Task Jobs_stuck_in_processing_are_requeued_but_running_ones_are_left_alone()
    {
        await using var db = TestFactory.NewDbContext();
        db.OdooSyncJobs.AddRange(
            new OdooSyncJob { JobType = SyncJobType.PartnerSync, Status = IntegrationStatus.Processing, UpdatedAt = Now.AddHours(-3), MotionParkTransactionId = "old" },
            new OdooSyncJob { JobType = SyncJobType.LeadSync, Status = IntegrationStatus.Processing, UpdatedAt = null, MotionParkTransactionId = "legacy" },
            new OdooSyncJob { JobType = SyncJobType.LeadSync, Status = IntegrationStatus.Processing, UpdatedAt = Now.AddMinutes(-1), MotionParkTransactionId = "running" });
        await db.SaveChangesAsync();

        var requeued = await SyncJobQueue.RequeueStuckAsync(db, Now, CancellationToken.None);

        Assert.Equal(2, requeued);
        var jobs = await db.OdooSyncJobs.ToDictionaryAsync(j => j.MotionParkTransactionId);
        Assert.Equal(IntegrationStatus.Pending, jobs["old"].Status);
        Assert.Equal(IntegrationStatus.Pending, jobs["legacy"].Status);
        Assert.NotNull(jobs["old"].LastError);
        Assert.Equal(IntegrationStatus.Processing, jobs["running"].Status);
    }

    [Fact]
    public async Task Retry_failed_requeues_jobs_that_used_all_attempts()
    {
        await using var db = TestFactory.NewDbContext();
        db.OdooSyncJobs.Add(new OdooSyncJob
        {
            JobType = SyncJobType.PartnerSync, Status = IntegrationStatus.Error, Attempts = 5, MaxAttempts = 5,
            LastError = "Invalid field 'mobile'", MotionParkTransactionId = "exhausted",
        });
        await db.SaveChangesAsync();

        var requeued = await SyncJobQueue.RequeueFailedAsync(db, Now, CancellationToken.None);

        Assert.Equal(1, requeued);
        var job = await db.OdooSyncJobs.SingleAsync();
        Assert.Equal(IntegrationStatus.Pending, job.Status);
        Assert.Equal(0, job.Attempts);
        Assert.Equal(Now, job.NextAttemptAt);
    }
}
