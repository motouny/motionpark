using Microsoft.EntityFrameworkCore;
using MotionPark.Domain.Bookings;
using MotionPark.Domain.Catalog;
using MotionPark.Domain.Cms;
using MotionPark.Domain;
using MotionPark.Domain.Customers;
using MotionPark.Domain.Identity;
using MotionPark.Domain.Integrations;
using MotionPark.Domain.Membership;
using MotionPark.Domain.Payments;
using MotionPark.Domain.Settings;
using AuditLog = MotionPark.Domain.System.AuditLog;

namespace MotionPark.Application.Common;

/// <summary>
/// EF Core context contract owned by Application so handlers stay persistence-agnostic.
/// Implemented by Infrastructure's MotionParkDbContext.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<PasswordResetToken> PasswordResetTokens { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Branch> Branches { get; }
    DbSet<ActivityCategory> ActivityCategories { get; }
    DbSet<Activity> Activities { get; }
    DbSet<Coach> Coaches { get; }
    DbSet<CoachActivity> CoachActivities { get; }
    DbSet<CoachBranch> CoachBranches { get; }
    DbSet<ClassSchedule> ClassSchedules { get; }
    DbSet<ScheduleMembershipPlan> ScheduleMembershipPlans { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<WaitingListEntry> WaitingListEntries { get; }
    DbSet<MembershipPlanReadModel> MembershipPlanReadModels { get; }
    DbSet<CustomerMembership> CustomerMemberships { get; }
    DbSet<OdooMapping> OdooMappings { get; }
    DbSet<OdooSyncJob> OdooSyncJobs { get; }
    DbSet<IntegrationLog> IntegrationLogs { get; }
    DbSet<Payment> Payments { get; }
    DbSet<PaymentTransaction> PaymentTransactions { get; }
    DbSet<Page> Pages { get; }
    DbSet<PageSection> PageSections { get; }
    DbSet<Banner> Banners { get; }
    DbSet<MediaAsset> MediaAssets { get; }
    DbSet<Faq> Faqs { get; }
    DbSet<Testimonial> Testimonials { get; }
    DbSet<Lead> Leads { get; }
    DbSet<BrandSettings> BrandSettings { get; }
    DbSet<SystemSettings> SystemSettings { get; }
    DbSet<Domain.System.Notification> Notifications { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Microsoft.EntityFrameworkCore.ChangeTracking.ChangeTracker ChangeTracker { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
