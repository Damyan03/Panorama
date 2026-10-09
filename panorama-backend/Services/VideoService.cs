using System.Text.Json;
using System.Linq;
using unnamed_site_backend.Contracts.Videos;
using unnamed_site_backend.Models;
using unnamed_site_backend.Repositories;

namespace unnamed_site_backend.Services;

public sealed class VideoService(IVideoRepository repository, IWebHostEnvironment environment) : IVideoService
{
    private readonly IVideoRepository _repository = repository;
    private readonly IWebHostEnvironment _environment = environment;

    public Task<List<Video>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return _repository.GetAllAsync(cancellationToken);
    }

    public Task<List<Video>> GetFilteredAsync(VideoListQuery query, CancellationToken cancellationToken = default)
    {
        return _repository.GetFilteredAsync(query, cancellationToken);
    }

    public Task<Video?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _repository.GetByIdAsync(id, cancellationToken);
    }

    public async Task<Video> CreateDraftAsync(int authorId, CancellationToken cancellationToken = default)
    {
        var video = new Video
        {
            Status = "draft",
            Title = "Draft",
            Description = string.Empty,
            AuthorId = authorId,
            Tags = new List<Tag>(),
            DayUploaded = DateTimeOffset.UtcNow,
            CoverSrc = string.Empty,
            Views = 0,
            TotalDuration = 0,
            ContentJson = "{}"
        };

        await _repository.UpsertAsync(video, cancellationToken);

        video.Title = $"Draft {video.Id}";
        await _repository.UpsertAsync(video, cancellationToken);

        return video;
    }

    public async Task<Video> UpdateDraftAsync(
        Video draft,
        SaveDraftRequest request,
        CancellationToken cancellationToken = default)
    {
        draft.Title = request.Title.Trim();
        draft.Description = request.Description;
        draft.Tags = NormalizeTagNames(request.Tags);
        draft.CoverSrc = request.CoverSrc;
        draft.TotalDuration = request.TotalDuration;
        draft.ContentJson = request.Content.GetRawText();

        await _repository.UpsertAsync(draft, cancellationToken);
        return draft;
    }

    public Task<List<Comment>> GetCommentsAsync(int videoId, CancellationToken cancellationToken = default)
    {
        return _repository.GetCommentsAsync(videoId, cancellationToken);
    }

    public Task<Comment?> GetCommentByIdAsync(int commentId, CancellationToken cancellationToken = default)
    {
        return _repository.GetCommentByIdAsync(commentId, cancellationToken);
    }

    public Task<Comment> AddCommentAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        return _repository.AddCommentAsync(comment, cancellationToken);
    }

    public Task<Comment?> UpdateCommentAsync(int videoId, int commentId, int userId, string text, CancellationToken cancellationToken = default)
    {
        return _repository.UpdateCommentAsync(videoId, commentId, userId, text, cancellationToken);
    }

    public Task<bool> DeleteCommentAsync(int videoId, int commentId, int userId, CancellationToken cancellationToken = default)
    {
        return _repository.DeleteCommentAsync(videoId, commentId, userId, cancellationToken);
    }

    public Task DeleteAsync(int id, int authorId, CancellationToken cancellationToken = default)
    {
        return _repository.DeleteAsync(id, authorId, cancellationToken);
    }

    public Task<int> ToggleLikeAsync(int videoId, int userId, CancellationToken cancellationToken = default)
    {
        return _repository.ToggleLikeAsync(videoId, userId, cancellationToken);
    }

    private static ICollection<Tag> NormalizeTagNames(params string[] tagNames)
    {
        return (tagNames ?? Array.Empty<string>())
            .Select(t => t?.Trim() ?? string.Empty)
            .Where(s => !string.IsNullOrEmpty(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(name => new Tag { Name = name })
            .ToList();
    }

    public async Task SeedTestVideoAsync(CancellationToken cancellationToken = default)
    {
        var testDataDirectory = Path.Combine(_environment.ContentRootPath, "Data", "TestData");
        var videoDirectory = Path.Combine(testDataDirectory, "Videos");
        if (!Directory.Exists(videoDirectory))
        {
            return;
        }

        foreach (var filePath in Directory.EnumerateFiles(videoDirectory, "C*.json").OrderBy(Path.GetFileName))
        {
            var payload = await File.ReadAllTextAsync(filePath, cancellationToken);
            using var document = JsonDocument.Parse(payload);
            var root = document.RootElement;

            var videoId = root.GetProperty("id").GetInt32();
            var existing = await _repository.GetByIdAsync(videoId, cancellationToken);
            if (existing is not null)
            {
                continue;
            }

            var video = new Video
            {
                Id = videoId,
                Status = root.TryGetProperty("status", out var statusElement)
                    ? statusElement.GetString() ?? "uploaded"
                    : "uploaded",
                Title = root.GetProperty("title").GetString() ?? string.Empty,
                Description = root.GetProperty("description").GetString() ?? string.Empty,
                AuthorId = root.GetProperty("authorId").GetInt32(),
                DayUploaded = DateTimeOffset.Parse(root.GetProperty("dayUploaded").GetString() ?? string.Empty),
                CoverSrc = root.GetProperty("coverSrc").GetString() ?? string.Empty,
                Views = root.GetProperty("views").GetInt32(),
                TotalDuration = root.GetProperty("totalDuration").GetInt32(),
                ContentJson = root.GetProperty("content").GetRawText()
            };

            video.Tags = NormalizeTagNames(root.GetProperty("tags").EnumerateArray().Select(item => item.GetString() ?? string.Empty).ToArray());

            await _repository.UpsertAsync(video, cancellationToken);
        }

        // Seed comments for videos if present
        var commentsDirectory = Path.Combine(testDataDirectory, "Comments");
        if (Directory.Exists(commentsDirectory))
        {
            foreach (var filePath in Directory.EnumerateFiles(commentsDirectory, "C*.json").OrderBy(Path.GetFileName))
            {
                var payload = await File.ReadAllTextAsync(filePath, cancellationToken);
                using var document = JsonDocument.Parse(payload);
                var root = document.RootElement;

                var commentId = root.GetProperty("id").GetInt32();
                var existing = await _repository.GetCommentByIdAsync(commentId, cancellationToken);
                if (existing is not null) continue;

                var comment = new Comment
                {
                    Id = commentId,
                    VideoId = root.GetProperty("videoId").GetInt32(),
                    UserId = root.GetProperty("userId").GetInt32(),
                    ParentCommentId = root.TryGetProperty("parentCommentId", out var parentCommentIdElement)
                        && parentCommentIdElement.ValueKind == JsonValueKind.Number
                        ? parentCommentIdElement.GetInt32()
                        : null,
                    Text = root.GetProperty("text").GetString() ?? string.Empty,
                    CreatedAt = DateTimeOffset.Parse(root.GetProperty("createdAt").GetString() ?? DateTimeOffset.UtcNow.ToString())
                };

                await _repository.AddCommentAsync(comment, cancellationToken);
            }
        }
    }
}
