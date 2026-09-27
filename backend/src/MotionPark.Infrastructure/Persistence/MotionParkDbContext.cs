using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Common;
using MotionPark.Domain.Bookings;
using MotionPark.Domain.Catalog;
using MotionPark.Domain.Cms;
using MotionPark.Domain.Customers;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Payments;
using MotionPark.Domain.Settings;
using MotionPark.Domain.System;
using AuditLog = MotionPark.Domain.System.AuditLog;

namespace MotionPark.Infrastructure.Persistence;

public class MotionParkDbContext(DbContextOptions<MotionParkDbContext> options) : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<ActivityCategory> ActivityCategories => Set<ActivityCategory>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Coach> Coaches => Set<Coach>();
    public DbSet<CoachActivity> CoachActivities => Set<CoachActivity>();
    public DbSet<CoachBranch> CoachBranches => Set<CoachBranch>();
    public DbSet<ClassSchedule> ClassSchedules => Set<ClassSchedule>();
    public DbSet<ScheduleMembershipPlan> ScheduleMembershipPlans => Set<ScheduleMembershipPlan>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<WaitingListEntry> WaitingListEntries => Set<WaitingListEntry>();
    public DbSet<MembershipPlanReadModel> MembershipPlanReadModels => Set<MembershipPlanReadModel>();
    public DbSet<CustomerMembership> CustomerMemberships => Set<CustomerMembership>();
    public DbSet<OdooMapping> OdooMappings => Set<OdooMapping>();
    public DbSet<OdooSyncJob> OdooSyncJobs => Set<OdooSyncJob>();
    public DbSet<IntegrationLog> IntegrationLogs => Set<IntegrationLog>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<PageSection> PageSections => Set<PageSection>();
    public DbSet<Banner> Banners => Set<Banner>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<Testimonial> Testimonials => Set<Testimonial>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<BrandSettings> BrandSettings => Set<BrandSettings>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Phone).IsUnique();
            e.HasIndex(u => u.NormalizedEmail).IsUnique().HasFilter("normalized_email IS NOT NULL");
        });

        modelBuilder.Entity<Role>().HasIndex(r => r.Name).IsUnique();
        modelBuilder.Entity<UserRole>().HasIndex(ur => new { ur.UserId, ur.RoleId }).IsUnique();
        modelBuilder.Entity<Permission>().HasIndex(p => new { p.RoleId, p.Key }).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(r => r.TokenHash).IsUnique();
        modelBuilder.Entity<PasswordResetToken>().HasIndex(r => r.TokenHash).IsUnique();

        modelBuilder.Entity<Customer>(e =>
        {
            e.HasIndex(c => c.Phone);
            e.HasOne<User>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Branch>().HasIndex(b => b.Slug).IsUnique();
        modelBuilder.Entity<Activity>().HasIndex(a => a.Slug).IsUnique();
        modelBuilder.Entity<ActivityCategory>().HasIndex(a => a.Slug).IsUnique();
        modelBuilder.Entity<Coach>().HasIndex(c => c.Slug).IsUnique();
        modelBuilder.Entity<CoachActivity>().HasIndex(x => new { x.CoachId, x.ActivityId }).IsUnique();
        modelBuilder.Entity<CoachBranch>().HasIndex(x => new { x.CoachId, x.BranchId }).IsUnique();

        modelBuilder.Entity<Branch>().Property(b => b.OperatingHours).HasColumnType("jsonb");
        modelBuilder.Entity<Coach>().Property(c => c.Certifications).HasColumnType("jsonb");

        modelBuilder.Entity<ClassSchedule>(e =>
        {
            e.HasIndex(s => new { s.BranchId, s.Date });
            e.Property(s => s.RowVersion).IsRowVersion();
        });
        modelBuilder.Entity<ScheduleMembershipPlan>().HasIndex(x => new { x.ScheduleId, x.MembershipPlanId }).IsUnique();

        modelBuilder.Entity<Booking>(e =>
        {
            e.HasIndex(b => new { b.CustomerId, b.ScheduleId });
            e.HasIndex(b => b.IdempotencyKey).IsUnique().HasFilter("idempotency_key IS NOT NULL");
        });
        modelBuilder.Entity<WaitingListEntry>().HasIndex(w => new { w.ScheduleId, w.Status, w.Position });

        modelBuilder.Entity<MembershipPlanReadModel>(e =>
        {
            e.ToTable("membership_plan_read_models");
            e.HasIndex(p => p.Slug).IsUnique();
            e.HasIndex(p => p.OdooProductId).IsUnique().HasFilter("odoo_product_id IS NOT NULL");
            e.Property(p => p.FeaturesAr).HasColumnType("jsonb");
            e.Property(p => p.FeaturesEn).HasColumnType("jsonb");
            e.Property(p => p.Branches).HasColumnType("jsonb");
            e.Property(p => p.Activities).HasColumnType("jsonb");
        });

        modelBuilder.Entity<CustomerMembership>(e =>
        {
            e.HasIndex(m => new { m.CustomerId, m.Status });
            e.HasIndex(m => m.OdooSyncJobTransactionId).IsUnique().HasFilter("odoo_sync_job_transaction_id IS NOT NULL");
        });

        modelBuilder.Entity<OdooMapping>()
            .HasIndex(m => new { m.EntityType, m.LocalId }).IsUnique();

        modelBuilder.Entity<OdooSyncJob>(e =>
        {
            e.Property(j => j.Payload).HasColumnType("jsonb");
            e.HasIndex(j => j.MotionParkTransactionId).IsUnique();
            e.HasIndex(j => new { j.Status, j.NextAttemptAt });
        });

        modelBuilder.Entity<IntegrationLog>(e =>
        {
            e.ToTable("integration_logs");
            e.Property(l => l.Timestamp).HasDefaultValueSql("now()");
            e.HasIndex(l => new { l.Entity, l.Timestamp });
        });

        modelBuilder.Entity<PaymentTransaction>(e =>
        {
            e.HasIndex(t => t.IdempotencyKey).HasFilter("idempotency_key IS NOT NULL");
        });

        modelBuilder.Entity<Page>().HasIndex(p => p.Slug).IsUnique();
        modelBuilder.Entity<PageSection>().HasIndex(s => s.SectionKey).IsUnique();
        modelBuilder.Entity<MediaAsset>(e =>
        {
            e.HasIndex(m => m.Category);
            e.HasIndex(m => m.Title);
        });
        modelBuilder.Entity<Lead>().HasIndex(l => l.Status);
        modelBuilder.Entity<Notification>().HasIndex(n => new { n.UserId, n.Status });
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(a => new { a.Entity, a.EntityId });
            e.Property(a => a.Timestamp).HasDefaultValueSql("now()");
        });
    }
}
