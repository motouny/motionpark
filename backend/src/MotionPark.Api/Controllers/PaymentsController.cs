using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MotionPark.Application.Common;
using MotionPark.Application.Messaging;
using MotionPark.Application.Payments;

namespace MotionPark.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(ISender sender, IConfiguration config, ILogger<PaymentsController> logger) : ControllerBase
{
    /// <summary>Settings for the browser payment form (amount in halalas, publishable key, metadata). 402 when payments are off.</summary>
    [HttpPost("checkout")]
    [Authorize]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request, CancellationToken ct)
    {
        var userId = HttpContext.User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)
            is { } claim && Guid.TryParse(claim.Value, out var id)
            ? id : throw new UnauthorizedAppException("Invalid token.");
        return Ok(await sender.Send(new PrepareCheckoutQuery(userId, request.MembershipPlanId), ct));
    }

    /// <summary>
    /// Moyasar webhook (dashboard → Settings → Webhooks, event "payment_paid", secret = PAYMENT_WEBHOOK_SECRET).
    /// Completes a subscription whose customer paid but never came back to the site.
    /// </summary>
    [HttpPost("moyasar/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> MoyasarWebhook([FromBody] JsonElement body, CancellationToken ct)
    {
        var secret = config["PAYMENT_WEBHOOK_SECRET"];
        if (string.IsNullOrWhiteSpace(secret)) return NotFound();

        var token = body.TryGetProperty("secret_token", out var t) && t.ValueKind == JsonValueKind.String ? t.GetString() : null;
        if (token is null || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(token), Encoding.UTF8.GetBytes(secret)))
            return Unauthorized();

        var type = body.TryGetProperty("type", out var ty) ? ty.GetString() : null;
        if (type != "payment_paid" || !body.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            return Ok();

        var paymentId = data.TryGetProperty("id", out var pid) ? pid.GetString() : null;
        if (string.IsNullOrWhiteSpace(paymentId)) return Ok();

        var metadata = new Dictionary<string, string>();
        if (data.TryGetProperty("metadata", out var md) && md.ValueKind == JsonValueKind.Object)
            foreach (var p in md.EnumerateObject())
                if (p.Value.ValueKind == JsonValueKind.String) metadata[p.Name] = p.Value.GetString()!;

        try
        {
            var outcome = await sender.Send(new ProcessPaidPaymentCommand(paymentId, metadata), ct);
            logger.LogInformation("Moyasar webhook for payment {PaymentId}: {Outcome}", paymentId, outcome);
        }
        catch (AppException ex)
        {
            // Permanent problem (payment mismatch, plan gone...). Acknowledge so Moyasar stops retrying; it is logged for follow-up.
            logger.LogWarning("Moyasar webhook for payment {PaymentId} not applied: {Code} {Message}", paymentId, ex.Code, ex.Message);
        }
        return Ok();
    }
}

public record CheckoutRequest(Guid MembershipPlanId);
