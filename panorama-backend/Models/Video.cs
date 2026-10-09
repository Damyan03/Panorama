namespace unnamed_site_backend.Models;

public sealed class Video
{
    public int Id { get; set; }

    public string Status { get; set; } = "uploaded";

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int AuthorId { get; set; }
    public ICollection<Tag> Tags { get; set; } = [];
    public ICollection<VideoLike> Likes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];

    public DateTimeOffset DayUploaded { get; set; }

    public string CoverSrc { get; set; } = string.Empty;

    public int Views { get; set; }

    public int TotalDuration { get; set; }

    public string ContentJson { get; set; } = "{}";
}
