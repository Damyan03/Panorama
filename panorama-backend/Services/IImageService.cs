namespace unnamed_site_backend.Services;

public interface IImageService
{
    Task<(string imageId, string imageUrl, string previewId, string previewUrl)> SaveImageAsync(IFormFile file, CancellationToken cancellationToken = default);

    Task<bool> DeleteImageAsync(string imageId, CancellationToken cancellationToken = default);

    Task<string?> GetImagePathAsync(string imageId);
}
