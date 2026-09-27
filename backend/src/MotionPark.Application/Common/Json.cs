using System.Text.Json;

namespace MotionPark.Application.Common;

public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static List<T> ParseList<T>(string? json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<T>>(json, Options) ?? []; }
        catch (JsonException) { return []; }
    }

    public static T? Parse<T>(string? json, T? fallback = default)
    {
        if (string.IsNullOrWhiteSpace(json)) return fallback;
        try { return JsonSerializer.Deserialize<T>(json, Options) ?? fallback; }
        catch (JsonException) { return fallback; }
    }

    public static string Stringify<T>(T value) => JsonSerializer.Serialize(value, Options);
}
