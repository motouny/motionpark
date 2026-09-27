using System.Text.Json;

namespace MotionPark.Api.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-ID";

    public async Task Invoke(HttpContext context)
    {
        var correlationId = context.Request.Headers[HeaderName].FirstOrDefault()
            ?? Guid.NewGuid().ToString("N");
        context.Response.Headers[HeaderName] = correlationId;
        await next(context);
    }
}

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var (status, code, extra) = ex switch
            {
                MotionPark.Application.Common.NotFoundException e => (404, e.Code, null),
                MotionPark.Application.Common.ConflictException e => (409, e.Code, null),
                MotionPark.Application.Common.ValidationAppException e => (400, e.Code, (object)e.Errors),
                MotionPark.Application.Common.PaymentRequiredException e => (402, e.Code, null),
                MotionPark.Application.Common.UnauthorizedAppException e => (401, e.Code, null),
                MotionPark.Application.Common.ForbiddenAppException e => (403, e.Code, null),
                MotionPark.Application.Abstractions.OdooUnavailableException => (502, "ODOO_UNAVAILABLE", null),
                _ => (500, "INTERNAL_ERROR", null),
            };

            if (status >= 500)
                logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

            var response = new Dictionary<string, object> { ["error"] = new Dictionary<string, object?> { ["code"] = code, ["message"] = ex.Message } };
            if (extra is not null) response["errors"] = extra;
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
        }
    }
}
