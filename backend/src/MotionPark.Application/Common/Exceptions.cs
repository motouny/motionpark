namespace MotionPark.Application.Common;

public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class NotFoundException(string code, string message) : AppException(code, message)
{
    public NotFoundException(string message) : this("NOT_FOUND", message) { }
}

public sealed class ConflictException(string code, string message) : AppException(code, message)
{
    public ConflictException(string message) : this("CONFLICT", message) { }
}

public sealed class ValidationAppException(string message, IDictionary<string, string[]> errors)
    : AppException("VALIDATION_ERROR", message)
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = new Dictionary<string, string[]>(errors);
}

/// <summary>Payment provider not configured — maps to HTTP 402 PAYMENT_CREDENTIALS_REQUIRED. Never fake success.</summary>
public sealed class PaymentRequiredException() : AppException("PAYMENT_CREDENTIALS_REQUIRED",
    "Payment provider is not configured. Set PAYMENT_PROVIDER/PAYMENT_KEY/PAYMENT_SECRET to enable payments.");

public sealed class UnauthorizedAppException(string message = "Invalid credentials") : AppException("UNAUTHORIZED", message);

public sealed class ForbiddenAppException(string message = "Forbidden") : AppException("FORBIDDEN", message);
