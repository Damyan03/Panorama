using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using unnamed_site_backend.Contracts.Tags;
using unnamed_site_backend.Data;
using unnamed_site_backend.Models;

namespace unnamed_site_backend.Services;

public sealed class TagService(AppDbContext dbContext, IWebHostEnvironment environment) : ITagService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IWebHostEnvironment _environment = environment;

    public async Task<List<TrendingTagResponse>> GetTrendingTagsAsync(int periodDays = 30, int limit = 10, CancellationToken cancellationToken = default)
    {
        var cutoff = DateTimeOffset.UtcNow.AddDays(-periodDays);

        var videos = await _dbContext.Videos
            .AsNoTracking()
            .Where(c => c.DayUploaded >= cutoff && c.Status == "uploaded")
            .Include(c => c.Tags)
            .ToListAsync(cancellationToken);

        return videos
            .SelectMany(c => c.Tags)
            .GroupBy(t => t.Name)
            .Select(g => new TrendingTagResponse(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .ToList();
    }

    public async Task SeedTestTagsAsync(CancellationToken cancellationToken = default)
    {
        var testDataDirectory = Path.Combine(_environment.ContentRootPath, "Data", "TestData");
        var tagsFilePath = Path.Combine(testDataDirectory, "Tags", "tags.json");

        if (!File.Exists(tagsFilePath))
        {
            return;
        }

        var payload = await File.ReadAllTextAsync(tagsFilePath, cancellationToken);
        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        foreach (var tagElement in root.EnumerateArray())
        {
            var name = tagElement.GetProperty("name").GetString() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var existing = await _dbContext.Tags.FirstOrDefaultAsync(t => t.Name == name, cancellationToken);
            if (existing is not null)
            {
                continue;
            }

            var tag = new Tag
            {
                Name = name.Trim(),
                CreatedAt = tagElement.TryGetProperty("createdAt", out var createdAtElement)
                    ? DateTimeOffset.Parse(createdAtElement.GetString() ?? string.Empty)
                    : DateTimeOffset.UtcNow
            };

            _dbContext.Tags.Add(tag);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
