namespace unnamed_site_backend.Models;

public sealed class Tag
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<Video> Videos { get; set; } = new List<Video>();
}
