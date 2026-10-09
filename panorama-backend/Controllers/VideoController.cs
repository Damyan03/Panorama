using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using unnamed_site_backend.Contracts.Videos;
using unnamed_site_backend.Models;
using unnamed_site_backend.Services;
using unnamed_site_backend.Controllers.Extensions;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/videos")]
public sealed class VideoController(
    IVideoService videoService,
    IUserService userService,
    IWebHostEnvironment environment) : ControllerBase
{
    private const int MaxPageSize = 100;
    private const int MaxPeriodDays = 365;

    private readonly IVideoService _videoService = videoService;
    private readonly IUserService _userService = userService;
    private readonly IWebHostEnvironment _environment = environment;

    private sealed record AuthorResponse(string? DisplayName, string? ProfilePicUrl, string? Username);

    [HttpGet]
    public async Task<IActionResult> GetVideos(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] string status = "uploaded",
        [FromQuery] string? tag = null,
        [FromQuery] string? sort = null,
        [FromQuery] int? period = null,
        [FromQuery] string? preferredTags = null,
        [FromQuery] string? hiddenTags = null,
        [FromQuery] int? timeRangeDays = null,
        [FromQuery] int? minDurationMinutes = null,
        [FromQuery] int? maxDurationMinutes = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        if (period.HasValue) period = Math.Clamp(period.Value, 1, MaxPeriodDays);
        if (timeRangeDays.HasValue) timeRangeDays = Math.Clamp(timeRangeDays.Value, 1, MaxPeriodDays);

        var filtered = await _videoService.GetFilteredAsync(
            new VideoListQuery(
                page,
                pageSize,
                status,
                tag,
                sort,
                period,
                ParseTagList(preferredTags),
                ParseTagList(hiddenTags),
                timeRangeDays,
                minDurationMinutes,
                maxDurationMinutes,
                search),
            cancellationToken);

        var hasSearch = !string.IsNullOrWhiteSpace(search);

        // For non-search listing, apply feed sorting/ranking. For search, keep
        // repository relevance order.
        var materialized = hasSearch
            ? filtered.ToArray()
            : ApplyFeedSort(filtered, sort, period).ToArray();
        var total = materialized.Length;

        var pageItems = materialized
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();

        var authorIds = pageItems.Select(video => video.AuthorId).ToArray();
        var authorMap = await _userService.GetInfoByIdsAsync(authorIds, cancellationToken);
        var authorCredentials = await _userService.GetCredentialsByIdsAsync(authorIds, cancellationToken);

        var items = pageItems.Select(ch => new
        {
            id = ch.Id,
            status = ch.Status,
            title = ch.Title,
            authorId = ch.AuthorId,
            author = BuildAuthorResponse(authorMap, authorCredentials, ch.AuthorId),
            dayUploaded = ch.DayUploaded,
            coverSrc = ch.CoverSrc,
            views = ch.Views,
            totalDuration = ch.TotalDuration,
            likes = ch.Likes?.Count() ?? 0
        }).ToArray();

        return Ok(new { items, total, page, pageSize });
    }

    private static IOrderedEnumerable<unnamed_site_backend.Models.Video> ApplyFeedSort(
        IEnumerable<unnamed_site_backend.Models.Video> videos,
        string? sort,
        int? period)
    {
        var now = DateTimeOffset.UtcNow;
        var periodDays = period ?? 30;

        return (sort ?? "newest").ToLowerInvariant() switch
        {
            "most-viewed" => videos
                .Where(ch => ch.DayUploaded >= now.AddDays(-periodDays))
                .OrderByDescending(ch => ch.Views)
                .ThenByDescending(ch => ch.DayUploaded),
            "trending" => videos
                .OrderByDescending(ch =>
                    (double)ch.Views / (Math.Max(1.0, (now - ch.DayUploaded).TotalDays) + 1.0))
                .ThenByDescending(ch => ch.DayUploaded),
            "top-rated" => videos
                .OrderByDescending(ch =>
                    (double)ch.Views / Math.Sqrt(Math.Max(1.0, (now - ch.DayUploaded).TotalDays) + 1.0))
                .ThenByDescending(ch => ch.Views),
            _ => videos
                .OrderByDescending(ch => ch.DayUploaded)
                .ThenByDescending(ch => ch.Views),
        };
    }

    [HttpGet("test")]
    public Task<IActionResult> GetTestVideo(CancellationToken cancellationToken)
    {
        // Diagnostic helper restricted to development to avoid leaking sample data in production.
        if (!_environment.IsDevelopment())
        {
            return Task.FromResult<IActionResult>(NotFound());
        }
        return GetVideoById(2, cancellationToken);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetVideoById(int id, CancellationToken cancellationToken)
    {
        var video = await _videoService.GetByIdAsync(id, cancellationToken);

        if (video is null)
        {
            return NotFound(new { message = $"video with id {id} not found" });
        }

        var authorMap = await _userService.GetInfoByIdsAsync([video.AuthorId], cancellationToken);
        var authorCredentials = await _userService.GetCredentialsByIdsAsync([video.AuthorId], cancellationToken);

        var userId = this.GetUserId();

        var likedByCurrentUser = userId is not null && (video.Likes?.Any(v => v.UserId == userId) ?? false);

        var result = new
        {
            id = video.Id,
            status = video.Status,
            title = video.Title,
            description = video.Description,
            authorId = video.AuthorId,
            author = BuildAuthorResponse(authorMap, authorCredentials, video.AuthorId),
            tags = video.Tags.Select(t => t.Name).ToArray(),
            dayUploaded = video.DayUploaded,
            coverSrc = video.CoverSrc,
            views = video.Views,
            likes = video.Likes?.Count() ?? 0,
            likedByCurrentUser,
            totalDuration = video.TotalDuration,
            content = video.ContentJson
        };

        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id:int}/like")]
    public async Task<IActionResult> ToggleLikeOnVideo(int id, CancellationToken cancellationToken)
    {
        var userId = this.GetUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        var likes = await _videoService.ToggleLikeAsync(id, userId.Value, cancellationToken);
        return Ok(new { likes });
    }

    

    private static AuthorResponse? BuildAuthorResponse(
        IReadOnlyDictionary<int, UserInfo> authorMap,
        IReadOnlyDictionary<int, UserCredentials> authorCredentials,
        int authorId)
    {
        if (!authorMap.TryGetValue(authorId, out var user))
        {
            return null;
        }

        var username = authorCredentials.TryGetValue(authorId, out var credentials)
            ? credentials.Username
            : null;

        return new AuthorResponse(user.DisplayName, user.ProfilePicUrl, username);
    }

    private static IReadOnlyList<string> ParseTagList(string? value)
    {
        return (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(tag => tag.Trim().ToLowerInvariant())
            .Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

}
