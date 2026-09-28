using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Auth;
using MotionPark.Application.Leads;
using MotionPark.Application.Messaging;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(ISender sender) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await sender.Send(new RegisterCommand(
            request.Name, request.Email, request.Phone, request.Password, request.PreferredLanguage ?? "ar"), ct);
        return Ok(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await sender.Send(new LoginQuery(request.Identifier, request.Password), ct);
        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var result = await sender.Send(new RefreshCommand(request.RefreshToken), ct);
        return Ok(result);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request, CancellationToken ct)
    {
        await sender.Send(new LogoutCommand(request?.RefreshToken), ct);
        return Ok(new { success = true });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("forgot")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await sender.Send(new ForgotPasswordCommand(request.Identifier), ct);
        return Ok(new { success = true });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await sender.Send(new ResetPasswordCommand(request.Token, request.NewPassword), ct);
        return Ok(new { success = true });
    }
}

public record RegisterRequest(string Name, string? Email, string Phone, string Password, string? PreferredLanguage);
public record LoginRequest(string Identifier, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record ForgotPasswordRequest(string Identifier);
public record ResetPasswordRequest(string Token, string NewPassword);

[ApiController]
[Route("api/public")]
public class LeadsController(ISender sender) : ControllerBase
{
    [HttpPost("leads")]
    [EnableRateLimiting("leads")]
    public async Task<IActionResult> CreateLead([FromBody] CreateLeadRequest request, CancellationToken ct)
    {
        var dto = await sender.Send(new CreateLeadCommand(
            request.Name, request.Phone, request.Email, request.Type,
            request.BranchId, request.ActivityId, request.MembershipPlanId, request.Message,
            request.UtmSource, request.UtmCampaign, request.UtmMedium), ct);
        return Ok(dto);
    }
}

public record CreateLeadRequest(
    string Name, string? Phone, string? Email, string Type,
    Guid? BranchId, Guid? ActivityId, Guid? MembershipPlanId, string? Message,
    string? UtmSource, string? UtmCampaign, string? UtmMedium);
