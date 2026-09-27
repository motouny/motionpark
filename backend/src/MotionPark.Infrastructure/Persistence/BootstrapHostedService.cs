using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MotionPark.Infrastructure.Persistence;

/// <summary>Startup bootstrap: wait for PostgreSQL, run EF migrations (never EnsureCreated), then seed + admin bootstrap.</summary>
public sealed class BootstrapHostedService(IServiceScopeFactory scopeFactory, IConfiguration config, ILogger<BootstrapHostedService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        const int maxAttempts = 30;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<MotionParkDbContext>();

                await db.Database.MigrateAsync(stoppingToken);
                await SeedService.SeedAsync(db, config, logger, stoppingToken);
                await SeedService.EnsureSuperAdminAsync(db, config, logger, stoppingToken);
                logger.LogInformation("Motion Park bootstrap complete: migrations applied, seed verified.");
                return;
            }
            catch (Exception ex) when (ex is Microsoft.EntityFrameworkCore.DbUpdateException
                or Npgsql.NpgsqlException or System.Net.Sockets.SocketException or TimeoutException)
            {
                logger.LogWarning(ex, "Bootstrap waiting for the database (attempt {Attempt}/{Max})", attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
            }
        }
        logger.LogCritical("Bootstrap failed: database unavailable after {Max} attempts.", maxAttempts);
    }
}
