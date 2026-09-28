using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MotionPark.Infrastructure.Persistence;

/// <summary>Design-time factory so `dotnet ef migrations add` works against the real configuration.</summary>
public class MotionParkDbContextFactory : IDesignTimeDbContextFactory<MotionParkDbContext>
{
    public MotionParkDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddEnvironmentVariables()
            .Build();

        var connectionString = config["DATABASE_CONNECTION"]
            ?? throw new InvalidOperationException("DATABASE_CONNECTION is not set.");

        var options = new DbContextOptionsBuilder<MotionParkDbContext>()
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention()
            .Options;

        return new MotionParkDbContext(options);
    }
}
