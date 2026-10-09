using unnamed_site_backend.Contracts.Tags;

namespace unnamed_site_backend.Services;

public interface ITagService
{
    Task<List<TrendingTagResponse>> GetTrendingTagsAsync(int periodDays = 30, int limit = 10, CancellationToken cancellationToken = default);

    Task SeedTestTagsAsync(CancellationToken cancellationToken = default);
}
