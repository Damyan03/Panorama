using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using unnamed_site_backend.Controllers.Extensions;
using unnamed_site_backend.Models;
using unnamed_site_backend.Services;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/videos/{videoId:int}/comments")]
public sealed class CommentsController(IVideoService videoService, IUserService userService) : ControllerBase
{
    private const int MaxCommentLength = 2000;

    private readonly IVideoService _videoService = videoService;
    private readonly IUserService _userService = userService;

    private sealed record CommentResponse(
        int Id,
        int VideoId,
        int UserId,
        int? ParentCommentId,
        string Text,
        DateTimeOffset CreatedAt,
        DateTimeOffset? UpdatedAt,
        AuthorResponse? Author,
        bool IsAdmin);

    public sealed record CommentRequest
    {
        [Required]
        [StringLength(MaxCommentLength, MinimumLength = 1)]
        public string Text { get; init; } = string.Empty;

        public int? ParentCommentId { get; init; }
    }

    private sealed record AuthorResponse(
        string? DisplayName,
        string? ProfilePicUrl,
        string? Username,
        IReadOnlyList<string> Labels);

    [HttpGet]
    public async Task<IActionResult> GetComments(int videoId, CancellationToken cancellationToken)
    {
        if (await _videoService.GetByIdAsync(videoId, cancellationToken) is null)
        {
            return NotFound(new { message = $"video with id {videoId} not found" });
        }

        var comments = await _videoService.GetCommentsAsync(videoId, cancellationToken);
        var userMap = await _userService.GetUserIdentityByIdsAsync(comments.Select(comment => comment.UserId), cancellationToken);

        var items = comments
            .Select(comment => MapComment(comment, userMap))
            .ToArray();

        return Ok(new { items });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> AddComment(int videoId, [FromBody] CommentRequest request, CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        if (await _videoService.GetByIdAsync(videoId, cancellationToken) is null)
        {
            return NotFound(new { message = $"video with id {videoId} not found" });
        }

        var normalizedText = request.Text?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedText))
        {
            return BadRequest(new { message = "Comment text is required." });
        }

        if (normalizedText.Length > MaxCommentLength)
        {
            return BadRequest(new { message = $"Comment text cannot exceed {MaxCommentLength} characters." });
        }

        int? parentCommentId = request.ParentCommentId;
        if (parentCommentId is not null)
        {
            var parentComment = await _videoService.GetCommentByIdAsync(parentCommentId.Value, cancellationToken);
            if (parentComment is null || parentComment.VideoId != videoId)
            {
                return BadRequest(new { message = "Invalid parent comment." });
            }
        }

        var comment = new Comment
        {
            VideoId = videoId,
            UserId = userId.Value,
            ParentCommentId = parentCommentId,
            Text = normalizedText,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var created = await _videoService.AddCommentAsync(comment, cancellationToken);
        var userMap = await _userService.GetUserIdentityByIdsAsync([created.UserId], cancellationToken);

        return Ok(MapComment(created, userMap));
    }

    [Authorize]
    [HttpPut("{commentId:int}")]
    public async Task<IActionResult> UpdateComment(int videoId, int commentId, [FromBody] CommentRequest request, CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        if (await _videoService.GetByIdAsync(videoId, cancellationToken) is null)
        {
            return NotFound(new { message = $"video with id {videoId} not found" });
        }

        var normalizedText = request.Text?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalizedText))
        {
            return BadRequest(new { message = "Comment text is required." });
        }

        if (normalizedText.Length > MaxCommentLength)
        {
            return BadRequest(new { message = $"Comment text cannot exceed {MaxCommentLength} characters." });
        }

        var updated = await _videoService.UpdateCommentAsync(videoId, commentId, userId.Value, normalizedText, cancellationToken);
        if (updated is null)
        {
            return Forbid();
        }

        var userMap = await _userService.GetUserIdentityByIdsAsync([updated.UserId], cancellationToken);
        return Ok(MapComment(updated, userMap));
    }

    [Authorize]
    [HttpDelete("{commentId:int}")]
    public async Task<IActionResult> DeleteComment(int videoId, int commentId, CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        if (await _videoService.GetByIdAsync(videoId, cancellationToken) is null)
        {
            return NotFound(new { message = $"video with id {videoId} not found" });
        }

        var deleted = await _videoService.DeleteCommentAsync(videoId, commentId, userId.Value, cancellationToken);
        if (!deleted)
        {
            return Forbid();
        }

        return NoContent();
    }

    private static CommentResponse MapComment(Comment comment, IReadOnlyDictionary<int, (UserInfo?, string, string?)> userMap)
    {
        userMap.TryGetValue(comment.UserId, out var userData);
        var (userInfo, role, username) = userData;
        var labels = UserProfileFields.DeserializeLabels(userInfo?.LabelsJson);

        return new CommentResponse(
            comment.Id,
            comment.VideoId,
            comment.UserId,
            comment.ParentCommentId,
            comment.Text,
            comment.CreatedAt,
            comment.UpdatedAt,
            userInfo is null
                ? null
                : new AuthorResponse(
                    userInfo.DisplayName,
                    userInfo.ProfilePicUrl,
                    username,
                    labels),
            role == "Admin");
    }
}
