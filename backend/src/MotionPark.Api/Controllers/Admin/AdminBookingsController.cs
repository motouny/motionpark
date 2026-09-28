using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Bookings;
using MotionPark.Application.Messaging;

namespace MotionPark.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/bookings")]
public class AdminBookingsController(ISender sender, IAuditLogger audit) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,CustomerService,BranchManager,ScheduleManager")]
    public async Task<IActionResult> GetBookings([FromQuery] string? status, [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to, [FromQuery] Guid? branchId, CancellationToken ct)
        => Ok(await sender.Send(new GetAdminBookingsQuery(status, from, to, branchId), ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CustomerService,BranchManager")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateBookingStatusRequest req, CancellationToken ct)
    {
        var result = await sender.Send(new UpdateBookingStatusCommand(id, req.Status, req.Reason), ct);
        await audit.LogAsync("Booking", id.ToString(), "StatusChanged", new { req.Status, req.Reason }, ct);
        return Ok(result);
    }
}

public record UpdateBookingStatusRequest(string Status, string? Reason);
