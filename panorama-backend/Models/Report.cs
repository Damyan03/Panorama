using System.Text.Json;

namespace unnamed_site_backend.Models;

public sealed class Report
{
    public int Id { get; set; }

    public string ResourceType { get; set; } = string.Empty; // e.g., "video", "comment", "profile"

    public int ResourceId { get; set; }

    public int? ReporterUserId { get; set; }

    public string? ReporterIp { get; set; }

    public string? ReporterEmail { get; set; }

    public string Reason { get; set; } = string.Empty; // predefined category

    public string? Details { get; set; }

    public string? MetadataJson { get; set; }

    public string Status { get; set; } = "new"; // new, in_review, resolved, dismissed

    public int? HandledBy { get; set; }

    public DateTimeOffset? HandledAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public object? GetMetadata()
    {
        if (string.IsNullOrEmpty(MetadataJson)) return null;
        try
        {
            return JsonSerializer.Deserialize<object>(MetadataJson);
        }
        catch
        {
            return null;
        }
    }
}
