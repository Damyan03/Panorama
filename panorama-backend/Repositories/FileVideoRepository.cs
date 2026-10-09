using Microsoft.EntityFrameworkCore;
using System.Linq;
using unnamed_site_backend.Data;
using unnamed_site_backend.Contracts.Videos;
using unnamed_site_backend.Models;

namespace unnamed_site_backend.Repositories;

public sealed class FileVideoRepository(AppDbContext dbContext) : IVideoRepository
{
    private readonly AppDbContext _dbContext = dbContext;

    private IQueryable<Video> VideosWithIncludes(bool asNoTracking = false)
    {
        var query = _dbContext.Videos.Include(c => c.Tags).Include(c => c.Likes).AsQueryable();
        return asNoTracking ? query.AsNoTracking() : query;
    }

    public Task<List<Video>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return VideosWithIncludes(true).ToListAsync(cancellationToken);
    }

    public async Task<List<Video>> GetFilteredAsync(VideoListQuery query, CancellationToken cancellationToken = default)
    {
        var videoQuery = VideosWithIncludes(true);
        var status = query.Status.Trim();
        var normalizedTag = NormalizeTag(query.Tag);
        var preferredTags = NormalizeTags(query.PreferredTags);
        var hiddenTags = NormalizeTags(query.HiddenTags);
        var searchTerms = VideoSearchLogic.ParseSearchTerms(query.Search);

        if (!string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            videoQuery = videoQuery.Where(video => video.Status.ToLower() == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(normalizedTag))
        {
            videoQuery = videoQuery.Where(video => video.Tags.Any(tag => tag.Name.ToLower() == normalizedTag));
        }

        if (preferredTags.Length > 0)
        {
            videoQuery = videoQuery.Where(video => video.Tags.Any(tag => preferredTags.Contains(tag.Name.ToLower())));
        }

        if (hiddenTags.Length > 0)
        {
            videoQuery = videoQuery.Where(video => !video.Tags.Any(tag => hiddenTags.Contains(tag.Name.ToLower())));
        }

        if (searchTerms.HasSearch)
        {
            videoQuery = VideoSearchLogic.ApplySearchFilters(videoQuery, searchTerms);
        }

        if (query.TimeRangeDays is > 0)
        {
            var windowStart = DateTimeOffset.UtcNow.AddDays(-query.TimeRangeDays.Value);
            videoQuery = videoQuery.Where(video => video.DayUploaded >= windowStart);
        }

        if (query.MinDurationMinutes is > 0)
        {
            var minDurationMs = query.MinDurationMinutes.Value * 60 * 1000;
            videoQuery = videoQuery.Where(video => video.TotalDuration >= minDurationMs);
        }

        if (query.MaxDurationMinutes is > 0)
        {
            var maxDurationMs = query.MaxDurationMinutes.Value * 60 * 1000;
            videoQuery = videoQuery.Where(video => video.TotalDuration <= maxDurationMs);
        }

        var filtered = await videoQuery.ToListAsync(cancellationToken);

        if (!searchTerms.HasSearch)
        {
            return filtered;
        }

        return filtered
            .Select(video => new
            {
                Video = video,
                Score = VideoSearchLogic.ComputeSearchScore(video, searchTerms),
            })
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Video.Views)
            .ThenByDescending(item => item.Video.DayUploaded)
            .Select(item => item.Video)
            .ToList();
    }

    public Task<Video?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return VideosWithIncludes(true).FirstOrDefaultAsync(video => video.Id == id, cancellationToken);
    }

    public async Task UpsertAsync(Video video, CancellationToken cancellationToken = default)
    {
        video.Tags = await ResolveTagsAsync(video.Tags, cancellationToken);

        var existing = await VideosWithIncludes(false).FirstOrDefaultAsync(item => item.Id == video.Id, cancellationToken);

        if (existing is null)
        {
            _dbContext.Videos.Add(video);
        }
        else
        {
            existing.Status = video.Status;
            existing.Title = video.Title;
            existing.Description = video.Description;
            existing.AuthorId = video.AuthorId;
            existing.Tags = video.Tags;
            existing.DayUploaded = video.DayUploaded;
            existing.CoverSrc = video.CoverSrc;
            existing.Views = video.Views;
            existing.TotalDuration = video.TotalDuration;
            existing.ContentJson = video.ContentJson;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<ICollection<Tag>> ResolveTagsAsync(ICollection<Tag> tags, CancellationToken cancellationToken = default)
    {
        var requestedNames = (tags ?? [])
            .Select(tag => tag?.Name?.Trim() ?? string.Empty)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (requestedNames.Length == 0)
        {
            return [];
        }

        var normalizedRequestedNames = requestedNames
            .Select(name => name.ToLowerInvariant())
            .ToArray();

        var existingTags = await _dbContext.Tags
            .Where(tag => normalizedRequestedNames.Contains(tag.Name.ToLower()))
            .ToListAsync(cancellationToken);

        var existingTagsByNormalizedName = existingTags
            .ToDictionary(tag => tag.Name.ToLowerInvariant(), StringComparer.Ordinal);

        var resolved = new List<Tag>(requestedNames.Length);

        foreach (var name in requestedNames)
        {
            var normalizedName = name.ToLowerInvariant();

            if (!existingTagsByNormalizedName.TryGetValue(normalizedName, out var dbTag))
            {
                dbTag = new Tag { Name = name };
                _dbContext.Tags.Add(dbTag);
                existingTagsByNormalizedName[normalizedName] = dbTag;
            }

            resolved.Add(dbTag);
        }

        return resolved;
    }

    private static string NormalizeTag(string? tag)
    {
        return tag?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    private static string[] NormalizeTags(IEnumerable<string>? tags)
    {
        return (tags ?? Array.Empty<string>())
            .Select(tag => NormalizeTag(tag))
            .Where(tag => !string.IsNullOrWhiteSpace(tag))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public async Task DeleteAsync(int id, int authorId, CancellationToken cancellationToken = default)
    {
        var video = await _dbContext.Videos.FirstOrDefaultAsync(
            c => c.Id == id && c.AuthorId == authorId,
            cancellationToken);
        if (video is not null)
        {
            _dbContext.Videos.Remove(video);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await _dbContext.SyncSequenceAsync("videos", "Id", cancellationToken);
        }
    }

    public async Task<int> ToggleLikeAsync(int videoId, int userId, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.VideoLikes.FirstOrDefaultAsync(v => v.VideoId == videoId && v.UserId == userId, cancellationToken);

        if (existing is null)
        {
            var v = new VideoLike { VideoId = videoId, UserId = userId };
            _dbContext.VideoLikes.Add(v);
        }
        else
        {
            // remove like (unlike)
            _dbContext.VideoLikes.Remove(existing);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var likes = await _dbContext.VideoLikes.CountAsync(v => v.VideoId == videoId, cancellationToken);
        return likes;
    }

    public async Task<List<Comment>> GetCommentsAsync(int videoId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Comments
            .AsNoTracking()
            .Where(c => c.VideoId == videoId)
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Comment?> GetCommentByIdAsync(int commentId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Comments.AsNoTracking().FirstOrDefaultAsync(comment => comment.Id == commentId, cancellationToken);
    }

    public async Task<Comment> AddCommentAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        _dbContext.Comments.Add(comment);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return comment;
    }

    public async Task<Comment?> UpdateCommentAsync(int videoId, int commentId, int userId, string text, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.VideoId == videoId, cancellationToken);
        if (existing is null || existing.UserId != userId)
        {
            return null;
        }

        existing.Text = text;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return existing;
    }

    public async Task<bool> DeleteCommentAsync(int videoId, int commentId, int userId, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.VideoId == videoId, cancellationToken);
        if (existing is null) return false;
        if (existing.UserId != userId) return false;
        _dbContext.Comments.Remove(existing);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
