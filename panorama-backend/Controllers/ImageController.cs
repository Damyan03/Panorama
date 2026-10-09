using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using unnamed_site_backend.Contracts.Images;
using unnamed_site_backend.Services;
using unnamed_site_backend.Controllers.Extensions;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/images")]
public sealed class ImageController(IImageService imageService) : ControllerBase
{
    private readonly IImageService _imageService = imageService;

    [Authorize]
    [HttpPost("upload")]
    public async Task<IActionResult> UploadImage(
        [FromForm] UploadImageRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request?.File == null || request.File.Length == 0)
            return BadRequest(new UploadImageResponse { Error = "No file provided." });

        return await this.ExecuteSafelyAsync(async () =>
        {
            try
            {
                var (imageId, imageUrl, previewId, previewUrl) = await _imageService.SaveImageAsync(request.File, cancellationToken);
                return Ok(new UploadImageResponse { Id = imageId, Url = imageUrl, PreviewId = previewId, PreviewUrl = previewUrl });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new UploadImageResponse { Error = ex.Message });
            }
        }, "Error uploading image: ", "An error occurred while uploading the image.");
    }

    [HttpGet("{*imageId}")]
    public async Task<IActionResult> GetImage(string imageId, CancellationToken cancellationToken = default)
    {
        var filePath = await _imageService.GetImagePathAsync(imageId);

        if (filePath == null || !System.IO.File.Exists(filePath))
            return NotFound();

        var contentType = GetContentType(Path.GetExtension(filePath));

        return await this.ExecuteSafelyAsync(async () =>
        {
            var stream = System.IO.File.OpenRead(filePath);
            return File(stream, contentType, enableRangeProcessing: true);
        }, $"Error streaming image {imageId}: ", "An error occurred while reading the image.");
    }

    [Authorize]
    [HttpDelete("{*imageId}")]
    public async Task<IActionResult> DeleteImage(string imageId, CancellationToken cancellationToken = default)
    {
        var deleted = await _imageService.DeleteImageAsync(imageId, cancellationToken);
        return deleted ? Ok() : NotFound();
    }

    private static string GetContentType(string extension) => extension.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };
}
