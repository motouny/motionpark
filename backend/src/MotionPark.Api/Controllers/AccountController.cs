using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using MotionPark.Application.Abstractions;
using MotionPark.Application.Account;
using MotionPark.Application.Bookings;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Subscriptions;
using MotionPark.Domain;

namespace MotionPark.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/account")]
public class AccountController(ISender sender, IApplicationDbContext db) : ControllerBase
{
    private Guid CurrentUserId => UserIdRequired();

    private Guid UserIdRequired() =>
        HttpContext.User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)
            is { } claim && Guid.TryParse(claim.Value, out var id)
            ? id
            : throw new UnauthorizedAppException("Invalid token.");

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
        => Ok(await sender.Send(new GetProfileQuery(CurrentUserId), ct));

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
        => Ok(await sender.Send(new UpdateProfileCommand(
            CurrentUserId, request.Name, request.Email, request.PreferredLanguage,
            request.DateOfBirth, request.Gender), ct));

    [HttpGet("membership")]
    public async Task<IActionResult> GetMembership(CancellationToken ct)
        => Ok(await sender.Send(new GetMembershipQuery(CurrentUserId), ct));

    [HttpGet("qr")]
    public async Task<IActionResult> GetQr(CancellationToken ct)
        => Ok(await sender.Send(new GetQrCommand(CurrentUserId), ct));

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings([FromQuery] string? status, CancellationToken ct)
        => Ok(await sender.Send(new GetMyBookingsQuery(CurrentUserId, status), ct));

    [HttpPost("bookings")]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        var key = Request.Headers["Idempotency-Key"].FirstOrDefault() ?? request.IdempotencyKey;
        return Ok(await sender.Send(new CreateBookingCommand(CurrentUserId, request.ScheduleId, key), ct));
    }

    [HttpPost("bookings/{id:guid}/cancel")]
    public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelBookingRequest? request, CancellationToken ct)
        => Ok(await sender.Send(new CancelBookingCommand(CurrentUserId, id, request?.Reason), ct));

    [HttpGet("payments")]
    public async Task<IActionResult> GetPayments(CancellationToken ct)
    {
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == CurrentUserId, ct);
        if (customer is null) return Ok(Array.Empty<object>());
        var payments = await db.Payments.Where(p => p.CustomerId == customer.Id)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id, p.Amount, p.Vat, p.Currency, status = p.Status.ToString(),
                p.PaymentMethod, p.OdooInvoiceId, p.CreatedAt,
            })
            .ToListAsync(ct);
        return Ok(payments);
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(CancellationToken ct)
    {
        // Invoices are owned by Odoo; this endpoint serves the locally mirrored payment/invoice metadata.
        var customer = await db.Customers.FirstOrDefaultAsync(c => c.UserId == CurrentUserId, ct);
        if (customer is null) return Ok(Array.Empty<object>());
        var invoices = await db.Payments
            .Where(p => p.CustomerId == customer.Id && p.OdooInvoiceId != null)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                number = p.OdooInvoiceId,
                date = p.CreatedAt,
                amount = p.Amount - p.Vat,
                vat = p.Vat,
                total = p.Amount,
                status = p.Status.ToString(),
                pdfUrl = (string?)null,
            })
            .ToListAsync(ct);
        return Ok(invoices);
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(CancellationToken ct)
    {
        var notifications = await db.Notifications
            .Where(n => n.UserId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(100)
            .Select(n => new
            {
                n.Id, n.Type, n.TitleAr, n.TitleEn, n.BodyAr, n.BodyEn,
                channel = n.Channel.ToString(), status = n.Status.ToString(),
                n.IsRead, n.ReadAt, n.CreatedAt,
            })
            .ToListAsync(ct);
        return Ok(notifications);
    }

    [HttpPost("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkNotificationRead(Guid id, CancellationToken ct)
    {
        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == CurrentUserId, ct);
        if (notification is not null)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { success = true });
    }

    [HttpGet("subscription")]
    public async Task<IActionResult> GetSubscription(CancellationToken ct)
        => Ok(await sender.Send(new GetSubscriptionQuery(CurrentUserId), ct));
}

public record UpdateProfileRequest(string? Name, string? Email, string? PreferredLanguage, DateTime? DateOfBirth, string? Gender);
public record CreateBookingRequest(Guid ScheduleId, string? IdempotencyKey);
public record CancelBookingRequest(string? Reason);

[ApiController]
[Route("api")]
public class MembershipsController(ISender sender) : ControllerBase
{
    [HttpGet("memberships")]
    [Authorize]
    public async Task<IActionResult> GetMemberships(CancellationToken ct)
        => Ok(await sender.Send(new MotionPark.Application.Memberships.GetMembershipPlansQuery(), ct));

    [HttpPost("subscriptions")]
    [Authorize]
    [EnableRateLimiting("subscriptions")]
    public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionRequest request, CancellationToken ct)
    {
        var key = HttpContext.Request.Headers["Idempotency-Key"].FirstOrDefault() ?? request.IdempotencyKey;
        var userId = HttpContext.User.Claims.FirstOrDefault(c => (c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)) is { } c && Guid.TryParse(c.Value, out var id)
            ? id : throw new UnauthorizedAppException("Invalid token.");
        return Ok(await sender.Send(new CreateSubscriptionCommand(
            userId, request.MembershipPlanId, request.BranchId, request.PaymentMethodId, key), ct));
    }

    [HttpPost("subscriptions/{id:guid}/cancel")]
    [Authorize]
    public async Task<IActionResult> CancelSubscription(Guid id, [FromBody] CancelSubscriptionRequest? request, CancellationToken ct)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(c => (c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)) is { } c && Guid.TryParse(c.Value, out var uid)
            ? uid : throw new UnauthorizedAppException("Invalid token.");
        return Ok(await sender.Send(new CancelSubscriptionCommand(userId, id, request?.Reason), ct));
    }

    [HttpPost("subscriptions/{id:guid}/renew")]
    [Authorize]
    public async Task<IActionResult> RenewSubscription(Guid id, CancellationToken ct)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(c => (c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)) is { } c && Guid.TryParse(c.Value, out var uid)
            ? uid : throw new UnauthorizedAppException("Invalid token.");
        return Ok(await sender.Send(new RenewSubscriptionCommand(userId, id), ct));
    }
}

public record CreateSubscriptionRequest(Guid MembershipPlanId, Guid? BranchId, string? PaymentMethodId, string? IdempotencyKey);
public record CancelSubscriptionRequest(string? Reason);
