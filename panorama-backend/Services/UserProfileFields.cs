using System.Text.Json;

namespace unnamed_site_backend.Services;

public static class UserProfileFields
{
    private const int MaxLabelLength = 32;
    private const int MaxLabels = 8;

    public static IReadOnlyList<string> DeserializeLabels(string? labelsJson)
    {
        if (string.IsNullOrWhiteSpace(labelsJson))
        {
            return Array.Empty<string>();
        }

        try
        {
            var labels = JsonSerializer.Deserialize<string[]>(labelsJson);
            return NormalizeLabels(labels);
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }

    public static string SerializeLabels(IEnumerable<string>? labels)
    {
        var normalized = NormalizeLabels(labels);
        return JsonSerializer.Serialize(normalized);
    }

    public static IReadOnlyList<string> NormalizeLabels(IEnumerable<string>? labels)
    {
        if (labels is null)
        {
            return Array.Empty<string>();
        }

        return labels
            .Where(label => !string.IsNullOrWhiteSpace(label))
            .Select(label => label.Trim())
            .Where(label => label.Length <= MaxLabelLength)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxLabels)
            .ToArray();
    }
}