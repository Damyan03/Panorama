using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using unnamed_site_backend.Contracts.Users;
using unnamed_site_backend.Controllers.Extensions;
using unnamed_site_backend.Data;
using unnamed_site_backend.Models;
using unnamed_site_backend.Services;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(
    IUserService userService,
    AppDbContext dbContext) : ControllerBase
{
    private const int RecentVideosCount = 12;
    private const int FollowingListLimit = 1000;

    private readonly IUserService _userService = userService;
    private readonly AppDbContext _dbContext = dbContext;

    /// <summary>Public profile lookup by username (case-insensitive).</summary>
    [HttpGet("{username}")]
    [AllowAnonymous]
    [EnableRateLimiting("publicProfile")]
    public async Task<IActionResult> GetPublicProfile(string username, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest(new { message = "Username is required." });
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(
            IsolationLevel.RepeatableRead,
            cancellationToken);

        var normalized = username.Trim().ToLowerInvariant();
        var matchPattern = EscapeLikePattern(normalized);
        var credentials = await _dbContext.UserCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => EF.Functions.ILike(u.Username, matchPattern, "\\"),
                cancellationToken);

        if (credentials is null || !credentials.IsActive)
        {
            return NotFound(new { message = "User not found." });
        }

        var info = await _dbContext.UserInfos
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == credentials.Id, cancellationToken);

        // Aggregate uploaded-only stats; drafts must never leak.
        var uploadedQuery = _dbContext.Videos
            .AsNoTracking()
            .Where(c => c.AuthorId == credentials.Id && c.Status == "uploaded");

        var stats = await uploadedQuery
            .GroupBy(_ => 1)
            .Select(g => new { Count = g.Count(), Views = g.Sum(c => c.Views) })
            .FirstOrDefaultAsync(cancellationToken);

        var totalLikes = await _dbContext.VideoLikes
            .AsNoTracking()
            .Where(l => uploadedQuery.Any(c => c.Id == l.VideoId))
            .CountAsync(cancellationToken);

        var followerCount = await _dbContext.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowedUserId == credentials.Id)
            .CountAsync(cancellationToken);

        var followingCount = await _dbContext.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowerUserId == credentials.Id)
            .CountAsync(cancellationToken);

        var currentUserId = this.GetUserId();
        var isFollowedByCurrentUser =
            currentUserId is int userId
            && userId != credentials.Id
            && await _dbContext.UserFollows
                .AsNoTracking()
                .AnyAsync(
                    f => f.FollowerUserId == userId && f.FollowedUserId == credentials.Id,
                    cancellationToken);

        var recent = await uploadedQuery
            .OrderByDescending(c => c.DayUploaded)
            .Take(RecentVideosCount)
            .Select(c => new PublicUserVideo(
                c.Id,
                c.Title,
                c.CoverSrc,
                c.DayUploaded,
                c.Views,
                c.Likes!.Count(),
                c.TotalDuration))
            .ToListAsync(cancellationToken);

        var labels = UserProfileFields.DeserializeLabels(info?.LabelsJson);

        await transaction.CommitAsync(cancellationToken);

        return Ok(new PublicUserResponse(
            credentials.Id,
            credentials.Username,
            info?.DisplayName ?? credentials.Username,
            info?.ProfilePicUrl ?? string.Empty,
            info?.ProfileDescription ?? string.Empty,
            info?.Gender ?? string.Empty,
            labels,
            info?.Age,
            info?.Nationality ?? string.Empty,
            credentials.Role,
            credentials.CreatedAt,
            stats?.Count ?? 0,
            totalLikes,
            stats?.Views ?? 0,
            followerCount,
            followingCount,
            isFollowedByCurrentUser,
            recent));
    }

    [Authorize]
    [HttpGet("me/following")]
    public async Task<IActionResult> GetMyFollowing(CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var follows = await _dbContext.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowerUserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(FollowingListLimit)
            .ToArrayAsync(cancellationToken);

        if (follows.Length == 0)
        {
            return Ok(Array.Empty<FollowingUserResponse>());
        }

        var followedIds = follows
            .Select(follow => follow.FollowedUserId)
            .Distinct()
            .ToArray();

        var credentialsMap = await _userService.GetCredentialsByIdsAsync(followedIds, cancellationToken);
        var infoMap = await _userService.GetInfoByIdsAsync(followedIds, cancellationToken);

        var result = new List<FollowingUserResponse>(follows.Length);
        foreach (var follow in follows)
        {
            if (!credentialsMap.TryGetValue(follow.FollowedUserId, out var credentials) || !credentials.IsActive)
            {
                continue;
            }

            infoMap.TryGetValue(follow.FollowedUserId, out var info);
            var displayName = string.IsNullOrWhiteSpace(info?.DisplayName)
                ? credentials.Username
                : info.DisplayName;

            result.Add(new FollowingUserResponse(
                credentials.Id,
                credentials.Username,
                displayName,
                info?.ProfilePicUrl ?? string.Empty,
                follow.CreatedAt));
        }

        return Ok(result);
    }

    [Authorize]
    [HttpPost("{username}/follow")]
    public async Task<IActionResult> FollowUser(string username, CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var followedUser = await FindActiveUserByUsernameAsync(username, cancellationToken);
        if (followedUser is null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (followedUser.Id == userId)
        {
            return BadRequest(new { message = "You cannot follow yourself." });
        }

        var existing = await _dbContext.UserFollows
            .FirstOrDefaultAsync(
                f => f.FollowerUserId == userId && f.FollowedUserId == followedUser.Id,
                cancellationToken);

        if (existing is null)
        {
            var newFollow = new UserFollow
            {
                FollowerUserId = userId,
                FollowedUserId = followedUser.Id,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _dbContext.UserFollows.Add(newFollow);

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                _dbContext.Entry(newFollow).State = EntityState.Detached;

                var followExists = await _dbContext.UserFollows
                    .AsNoTracking()
                    .AnyAsync(
                        f => f.FollowerUserId == userId && f.FollowedUserId == followedUser.Id,
                        cancellationToken);

                if (!followExists)
                {
                    throw;
                }
            }
        }

        var state = await BuildFollowStateAsync(userId, followedUser.Id, cancellationToken);
        return Ok(state);
    }

    [Authorize]
    [HttpDelete("{username}/follow")]
    public async Task<IActionResult> UnfollowUser(string username, CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var followedUser = await FindActiveUserByUsernameAsync(username, cancellationToken);
        if (followedUser is null)
        {
            return NotFound(new { message = "User not found." });
        }

        var existing = await _dbContext.UserFollows
            .FirstOrDefaultAsync(
                f => f.FollowerUserId == userId && f.FollowedUserId == followedUser.Id,
                cancellationToken);

        if (existing is not null)
        {
            _dbContext.UserFollows.Remove(existing);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var state = await BuildFollowStateAsync(userId, followedUser.Id, cancellationToken);
        return Ok(state);
    }

    [Authorize]
    [HttpGet("me/settings")]
    public async Task<IActionResult> GetMySettings(CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var settings = await LoadSettingsAsync(userId, cancellationToken);
        return settings is null
            ? NotFound(new { message = "User not found." })
            : Ok(settings);
    }

    [Authorize]
    [HttpPatch("me/settings")]
    public async Task<IActionResult> UpdateMySettings([FromBody] UpdateUserSettingsRequest request, CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var outcome = await _userService.UpdateUserSettingsAsync(
            userId,
            request.DisplayName,
            request.Username,
            request.Email,
            request.ProfilePicUrl,
            request.ProfileDescription,
            request.Gender,
            request.Labels,
            request.Age,
            request.ClearAge,
            request.Nationality,
            cancellationToken);

        return outcome switch
        {
            IUserService.UpdateUserOutcome.Success => Ok(await LoadSettingsAsync(userId, cancellationToken)),
            IUserService.UpdateUserOutcome.UsernameTaken => Conflict(new { message = "That username is already in use." }),
            IUserService.UpdateUserOutcome.EmailTaken => Conflict(new { message = "That email is already in use." }),
            IUserService.UpdateUserOutcome.NotFound => NotFound(new { message = "User not found." }),
            _ => BadRequest(new { message = "Unable to update settings." }),
        };
    }

    [Authorize]
    [HttpPost("me/password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId) return InvalidToken();

        var outcome = await _userService.ChangePasswordAsync(
            userId,
            request.CurrentPassword,
            request.NewPassword,
            cancellationToken);

        return outcome switch
        {
            IUserService.UpdateUserOutcome.Success => NoContent(),
            IUserService.UpdateUserOutcome.InvalidCurrentPassword => BadRequest(new { message = "Current password is incorrect." }),
            IUserService.UpdateUserOutcome.NotFound => NotFound(new { message = "User not found." }),
            _ => BadRequest(new { message = "Unable to change password." }),
        };
    }

    private async Task<UserSettingsResponse?> LoadSettingsAsync(int userId, CancellationToken cancellationToken)
    {
        var credentials = await _userService.GetCredentialsByIdAsync(userId, cancellationToken);
        if (credentials is null) return null;

        var infoMap = await _userService.GetInfoByIdsAsync([userId], cancellationToken);
        infoMap.TryGetValue(userId, out UserInfo? info);
        var labels = UserProfileFields.DeserializeLabels(info?.LabelsJson);

        return new UserSettingsResponse(
            credentials.Id,
            credentials.Username,
            credentials.Email,
            info?.DisplayName ?? credentials.Username,
            info?.ProfilePicUrl ?? string.Empty,
            info?.ProfileDescription ?? string.Empty,
            info?.Gender ?? string.Empty,
            labels,
            info?.Age,
            info?.Nationality ?? string.Empty,
            credentials.Role,
            credentials.CreatedAt);
    }

    private UnauthorizedObjectResult InvalidToken() =>
        Unauthorized(new { message = "Invalid token." });

    private async Task<UserCredentials?> FindActiveUserByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(username)) return null;

        var normalized = username.Trim().ToLowerInvariant();
        var matchPattern = EscapeLikePattern(normalized);
        return await _dbContext.UserCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.IsActive && EF.Functions.ILike(user.Username, matchPattern, "\\"),
                cancellationToken);
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }

    private async Task<FollowStateResponse> BuildFollowStateAsync(
        int followerUserId,
        int profileUserId,
        CancellationToken cancellationToken)
    {
        var state = await _dbContext.UserFollows
            .AsNoTracking()
            .Where(f =>
                f.FollowerUserId == followerUserId ||
                f.FollowerUserId == profileUserId ||
                f.FollowedUserId == profileUserId)
            .GroupBy(_ => 1)
            .Select(group => new
            {
                IsFollowing = group.Any(f => f.FollowerUserId == followerUserId && f.FollowedUserId == profileUserId),
                FollowerCount = group.Count(f => f.FollowedUserId == profileUserId),
                FollowingCount = group.Count(f => f.FollowerUserId == profileUserId),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new FollowStateResponse(
            state?.IsFollowing ?? false,
            state?.FollowerCount ?? 0,
            state?.FollowingCount ?? 0);
    }
}
