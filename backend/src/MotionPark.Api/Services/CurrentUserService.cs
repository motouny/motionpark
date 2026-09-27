using System.Security.Claims;
using MotionPark.Application.Abstractions;

namespace MotionPark.Api.Services;

public sealed class CurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? accessor.HttpContext?.User.FindFirstValue("sub"), out var id) ? id : null;

    public string? Email => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);
    public string? Phone => accessor.HttpContext?.User.FindFirstValue("phone");

    public IReadOnlyCollection<string> Roles =>
        accessor.HttpContext?.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList()
        ?? (IReadOnlyList<string>)[];

    public bool IsInRole(string role) => accessor.HttpContext?.User.IsInRole(role) ?? false;
    public bool IsAuthenticated => accessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public string? IpAddress => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}
