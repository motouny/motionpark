namespace MotionPark.Api;

/// <summary>Loads KEY=VALUE pairs from a .env file into environment variables (no override of existing vars).</summary>
public static class EnvLoader
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;
        foreach (var rawLine in File.ReadLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;
            var eq = line.IndexOf('=');
            if (eq <= 0) continue;
            var key = line[..eq].Trim();
            var value = line[(eq + 1)..].Trim();
            if (value.Length >= 2 && value.StartsWith('"') && value.EndsWith('"')) value = value[1..^1];
            if (value.Length >= 2 && value.StartsWith('\'') && value.EndsWith('\'')) value = value[1..^1];
            if (Environment.GetEnvironmentVariable(key) is null)
                Environment.SetEnvironmentVariable(key, value);
        }
    }
}
