using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController(HealthCheckService healthCheckService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var report = await healthCheckService.CheckHealthAsync(ct);
        var checks = report.Entries.ToDictionary(
            e => e.Key,
            e => new
            {
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                exception = e.Value.Exception?.Message,
                durationMs = e.Value.Duration.TotalMilliseconds,
            });

        // Odoo failure degrades; only database/redis failures make the platform unhealthy.
        var critical = new[] { "database", "redis" };
        var status = report.Entries.Any(e => critical.Contains(e.Key) && e.Value.Status == HealthStatus.Unhealthy)
            ? "Unhealthy"
            : report.Status == HealthStatus.Healthy ? "Healthy" : "Degraded";

        return Ok(new { status, checks });
    }

    [HttpGet("database")]
    public async Task<IActionResult> GetDatabase(CancellationToken ct) => Ok(await CheckOne("database", ct));

    [HttpGet("redis")]
    public async Task<IActionResult> GetRedis(CancellationToken ct) => Ok(await CheckOne("redis", ct));

    [HttpGet("odoo")]
    public async Task<IActionResult> GetOdoo(CancellationToken ct) => Ok(await CheckOne("odoo", ct));

    private async Task<object> CheckOne(string name, CancellationToken ct)
    {
        var report = await healthCheckService.CheckHealthAsync(r => r.Name == name, ct);
        var entry = report.Entries.FirstOrDefault(e => e.Key == name);
        return new
        {
            name,
            status = (entry.Value.Status == HealthStatus.Unhealthy && name == "odoo" ? "Degraded" : entry.Value.Status.ToString()),
            description = entry.Value.Description,
            exception = entry.Value.Exception?.Message,
        };
    }
}
