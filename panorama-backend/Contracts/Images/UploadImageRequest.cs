namespace unnamed_site_backend.Contracts.Images;

public sealed class UploadImageRequest
{
    public IFormFile? File { get; set; }
}
