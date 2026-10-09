using unnamed_site_backend.Models;
using unnamed_site_backend.Contracts.Videos;

namespace unnamed_site_backend.Repositories;

public interface IVideoRepository
{
    Task<List<Video>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<List<Video>> GetFilteredAsync(VideoListQuery query, CancellationToken cancellationToken = default);

    Task<Video?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task UpsertAsync(Video video, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, int authorId, CancellationToken cancellationToken = default);

    Task<int> ToggleLikeAsync(int videoId, int userId, CancellationToken cancellationToken = default);
    Task<List<Comment>> GetCommentsAsync(int videoId, CancellationToken cancellationToken = default);

    Task<Comment?> GetCommentByIdAsync(int commentId, CancellationToken cancellationToken = default);

    Task<Comment> AddCommentAsync(Comment comment, CancellationToken cancellationToken = default);

    Task<Comment?> UpdateCommentAsync(int videoId, int commentId, int userId, string text, CancellationToken cancellationToken = default);

    Task<bool> DeleteCommentAsync(int videoId, int commentId, int userId, CancellationToken cancellationToken = default);
}
