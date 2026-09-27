using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Infrastructure.Auth;
using MotionPark.Infrastructure.Jobs;
using MotionPark.Infrastructure.Locking;
using MotionPark.Infrastructure.Odoo;
using MotionPark.Infrastructure.Payments;
using MotionPark.Infrastructure.Persistence;
using MotionPark.Infrastructure.Services;
using StackExchange.Redis;

namespace MotionPark.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddMotionParkInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<MotionParkDbContext>(options =>
        {
            options.UseNpgsql(config["DATABASE_CONNECTION"], npgsql =>
            {
                npgsql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(2), null);
                npgsql.MigrationsHistoryTable("__ef_migrations", "public");
            });
            options.UseSnakeCaseNamingConvention();
        });
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<MotionParkDbContext>());

        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IDateTime, SystemDateTime>();

        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectRedis(config)!);
        services.AddSingleton<ILockProvider, RedisLockProvider>();

        services.AddHttpClient<IOdooClient, XmlRpcOdooClient>();

        services.AddHttpClient(PaymentProviderFactory.MoyasarHttpClient, c => c.Timeout = TimeSpan.FromSeconds(30));
        services.AddSingleton<IPaymentProviderFactory, PaymentProviderFactory>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAuditLogger, AuditLogger>();
        services.AddScoped<OutboxDispatcher>();

        services.AddHostedService<BackgroundJobService>();
        services.AddHostedService<BootstrapHostedService>();

        return services;
    }

    private static IConnectionMultiplexer? ConnectRedis(IConfiguration config)
    {
        var connectionString = config["REDIS_CONNECTION"] ?? "127.0.0.1:6379";
        try
        {
            return ConnectionMultiplexer.Connect(new ConfigurationOptions
            {
                EndPoints = { connectionString.Split(',')[0] },
                AbortOnConnectFail = false,
                ConnectTimeout = 3000,
                SyncTimeout = 3000,
            });
        }
        catch
        {
            return null; // Redis optional at startup; the health check reports it
        }
    }
}
