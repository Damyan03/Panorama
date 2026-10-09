namespace unnamed_site_backend.Models;

public sealed class UserFollow
{
    public int Id { get; set; }

    public int FollowerUserId { get; set; }

    public int FollowedUserId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}