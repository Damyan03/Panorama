namespace unnamed_site_backend.Models;

public sealed class VideoLike
{
    public int Id { get; set; }

    public int VideoId { get; set; }
    public Video Video { get; set; } = null!;

    public int UserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
