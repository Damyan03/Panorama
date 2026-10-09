using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace unnamed_site_backend.Services;

public sealed class ImageService(IWebHostEnvironment environment) : IImageService
{
    private readonly IWebHostEnvironment _environment = environment;
    private readonly string[] _allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const long MaxFileSize = 10 * 1024 * 1024;

    public async Task<(string imageId, string imageUrl, string previewId, string previewUrl)> SaveImageAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is required and cannot be empty.", nameof(file));

        if (file.Length > MaxFileSize)
            throw new ArgumentException($"File size exceeds maximum allowed size of {MaxFileSize / 1024 / 1024} MB.", nameof(file));

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension))
            throw new ArgumentException("Uploaded file has no extension.", nameof(file));

        if (!_allowedExtensions.Contains(extension))
            throw new ArgumentException($"File type '{extension}' is not allowed. Allowed types: {string.Join(", ", _allowedExtensions)}", nameof(file));

        var imagesDirectory = GetImagesDirectory();

        var originalsDir = Path.Combine(imagesDirectory, "originals");
        var previewsDir = Path.Combine(imagesDirectory, "previews");
        if (!Directory.Exists(originalsDir)) Directory.CreateDirectory(originalsDir);
        if (!Directory.Exists(previewsDir)) Directory.CreateDirectory(previewsDir);

        var originalFileName = $"originals/{Guid.NewGuid()}.webp";
        var originalPath = Path.Combine(imagesDirectory, originalFileName.Replace('/', Path.DirectorySeparatorChar));

        var previewFileName = $"previews/{Guid.NewGuid()}.webp";
        var previewPath = Path.Combine(imagesDirectory, previewFileName.Replace('/', Path.DirectorySeparatorChar));

        using var image = await Image.LoadAsync(file.OpenReadStream(), cancellationToken);

        var originalEncoder = new WebpEncoder { Quality = 95 };
        await image.SaveAsync(originalPath, originalEncoder, cancellationToken);

        try
        {
            var maxDim = 256;
            var longest = Math.Max(image.Width, image.Height);
            if (longest > maxDim)
            {
                var scale = maxDim / (double)longest;
                var newW = Math.Max(1, (int)Math.Round(image.Width * scale));
                var newH = Math.Max(1, (int)Math.Round(image.Height * scale));
                image.Mutate(x => x.Resize(newW, newH));
            }

            var previewEncoder = new WebpEncoder { Quality = 80 };
            await image.SaveAsync(previewPath, previewEncoder, cancellationToken);
        }
        catch
        {
            if (File.Exists(previewPath)) File.Delete(previewPath);
            throw;
        }

        return (originalFileName, $"/api/images/{originalFileName}", previewFileName, $"/api/images/{previewFileName}");
    }

    public Task<bool> DeleteImageAsync(string imageId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(imageId) || !ValidatePath(imageId, out var filePath))
            return Task.FromResult(false);

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public Task<string?> GetImagePathAsync(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId) || !ValidatePath(imageId, out var filePath))
            return Task.FromResult<string?>(null);

        return File.Exists(filePath) ? Task.FromResult<string?>(filePath) : Task.FromResult<string?>(null);
    }

    private bool ValidatePath(string imageId, out string filePath)
    {
        filePath = string.Empty;

        // Reject anything that could escape the uploads directory.
        if (string.IsNullOrWhiteSpace(imageId)
            || imageId.Contains("..", StringComparison.Ordinal)
            || imageId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0
            || Path.IsPathRooted(imageId))
        {
            return false;
        }

        var imagesDirectory = GetImagesDirectory();
        var fullDirectory = Path.GetFullPath(imagesDirectory);
        var directoryWithSeparator = fullDirectory.EndsWith(Path.DirectorySeparatorChar)
            ? fullDirectory
            : fullDirectory + Path.DirectorySeparatorChar;

        var combined = Path.GetFullPath(Path.Combine(imagesDirectory, imageId));
        if (!combined.StartsWith(directoryWithSeparator, StringComparison.Ordinal))
        {
            return false;
        }

        filePath = combined;
        return true;
    }

    private string GetImagesDirectory()
    {
        var directory = Path.Combine(_environment.ContentRootPath, "uploads", "images");
        if (!Directory.Exists(directory))
            Directory.CreateDirectory(directory);
        return directory;
    }
}
