using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using unnamed_site_backend.Contracts.Videos;
using unnamed_site_backend.Services;
using unnamed_site_backend.Controllers.Extensions;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Authorize]
[Route("api/videos")]
public sealed class DraftVideoController(IVideoService videoService) : ControllerBase
{
    private readonly IVideoService _videoService = videoService;

    [HttpGet("my-drafts")]
    public async Task<IActionResult> GetMyDraftVideos(CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        var drafts = (await _videoService.GetAllAsync(cancellationToken))
            .Where(ch => ch.AuthorId == userId.Value)
            .Where(ch => string.Equals(ch.Status, "draft", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(ch => ch.DayUploaded)
            .Select(ch => new
            {
                id = ch.Id,
                status = ch.Status,
                title = ch.Title,
                dayUploaded = ch.DayUploaded,
                coverSrc = ch.CoverSrc,
                views = ch.Views,
                totalDuration = ch.TotalDuration
            })
            .ToArray();

        return Ok(new { items = drafts, total = drafts.Length });
    }

    [HttpPost("drafts")]
    public async Task<IActionResult> CreateMyDraftVideo(CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        return await this.ExecuteSafelyAsync(async () =>
        {
            var video = await _videoService.CreateDraftAsync(userId.Value, cancellationToken);

            return Ok(new
            {
                id = video.Id,
                status = video.Status,
                title = video.Title
            });
        }, $"Error creating draft for user {userId}: ", "An error occurred creating the draft.");
    }

    [HttpDelete("drafts/{id:int}")]
    public async Task<IActionResult> DeleteMyDraftVideo(int id, CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        return await this.ExecuteSafelyAsync(async () =>
        {
            var video = await _videoService.GetByIdAsync(id, cancellationToken);
            if (video is null)
            {
                return NotFound(new { message = $"Draft with id {id} not found." });
            }

            if (video.AuthorId != userId.Value)
            {
                return Forbid();
            }

            if (!string.Equals(video.Status, "draft", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only draft videos can be deleted." });
            }

            await _videoService.DeleteAsync(id, userId.Value, cancellationToken);
            return Ok(new { message = "Draft deleted successfully." });
        }, $"Error deleting draft {id} for user {userId}: ", "An error occurred deleting the draft.");
    }

    [HttpPut("drafts/{id:int}")]
    public async Task<IActionResult> UpdateMyDraftVideo(
        int id,
        [FromBody] SaveDraftRequest request,
        CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        var video = await _videoService.GetByIdAsync(id, cancellationToken);
        if (video is null)
        {
            return NotFound(new { message = $"Draft with id {id} not found." });
        }

        if (video.AuthorId != userId.Value)
        {
            return Forbid();
        }

        if (!string.Equals(video.Status, "draft", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only draft videos can be saved." });
        }

        return await this.ExecuteSafelyAsync(async () =>
        {
            await _videoService.UpdateDraftAsync(video, request, cancellationToken);
            return Ok(new { message = "Draft saved successfully." });
        }, $"Error saving draft {id} for user {userId}: ", "An error occurred saving the draft.");
    }

}