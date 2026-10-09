namespace unnamed_site_backend.Models;

public sealed class Comment
{
    public int Id { get; set; }

    public int VideoId { get; set; }

    public int UserId { get; set; }

    public int? ParentCommentId { get; set; }

    public string Text { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public Video? Video { get; set; }
    public UserInfo? User { get; set; }
    public Comment? ParentComment { get; set; }
    public ICollection<Comment> Replies { get; set; } = [];
}
