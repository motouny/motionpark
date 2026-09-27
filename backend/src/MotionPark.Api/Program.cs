using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MotionPark.Api.Middleware;
using MotionPark.Api.Services;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Domain.Identity;
using MotionPark.Infrastructure;
using MotionPark.Infrastructure.Health;
using MotionPark.Infrastructure.Persistence;
using System.Threading.RateLimiting;

namespace MotionPark.Api;

public class Program
{
    public static async Task Main(string[] args)
    {
        EnvLoader.Load(Path.Combine(AppContext.BaseDirectory, ".env"));
        EnvLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

        var builder = WebApplication.CreateBuilder(args);
        builder.Configuration.AddEnvironmentVariables();

        var jwtSecret = builder.Configuration["JWT_SECRET"] ?? string.Empty;
        var jwtKeyBytes = Encoding.UTF8.GetByteCount(jwtSecret) >= 64 && IsBase64(jwtSecret)
            ? Convert.FromBase64String(jwtSecret)
            : System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(jwtSecret));

        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["JWT_ISSUER"] ?? "motionpark",
                ValidateAudience = true,
                ValidAudience = builder.Configuration["JWT_AUDIENCE"] ?? "motionpark",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1),
            };
        });

        builder.Services.AddAuthorization(options =>
        {
            foreach (var role in RoleNames.All)
                options.AddPolicy(role, p => p.RequireRole(role));
        });

        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 300,
                        Window = TimeSpan.FromMinutes(1),
                    }));

            void AddPolicy(string name, int limit, int minutes) =>
                options.AddPolicy(name, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = limit,
                            Window = TimeSpan.FromMinutes(minutes),
                        }));

            AddPolicy("login", 10, 5);
            AddPolicy("register", 5, 10);
            AddPolicy("forgot", 5, 10);
            AddPolicy("leads", 10, 10);
            AddPolicy("subscriptions", 20, 10);
        });

        builder.Services.AddHealthChecks()
            .AddDbContextCheck<MotionParkDbContext>("database")
            .AddCheck<RedisHealthCheck>("redis")
            .AddCheck<OdooHealthCheck>("odoo");

        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
        builder.Services.AddMotionParkApplication();
        builder.Services.AddMotionParkInfrastructure(builder.Configuration);

        builder.Services.AddControllers()
            .AddJsonOptions(o =>
            {
                o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
            });
        builder.Services.AddEndpointsApiExplorer();

        var enableSwagger = string.Equals(builder.Configuration["ENABLE_SWAGGER"], "true", StringComparison.OrdinalIgnoreCase);
        if (enableSwagger)
        {
            builder.Services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "Motion Park API", Version = "v1" });
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [],
                });
            });
        }

        var app = builder.Build();

        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        app.UseAuthentication();
        app.UseAuthorization();
        app.UseRateLimiter();

        if (enableSwagger)
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.MapControllers();
        await app.RunAsync();
    }

    private static bool IsBase64(string value)
    {
        Span<byte> buffer = stackalloc byte[value.Length];
        return Convert.TryFromBase64String(value, buffer, out _);
    }
}
