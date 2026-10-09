namespace unnamed_site_backend.Contracts.Images;

public sealed class UploadImageResponse
{
    public string Id { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string PreviewId { get; set; } = string.Empty;

    public string PreviewUrl { get; set; } = string.Empty;

    public string? Error { get; set; }
}
