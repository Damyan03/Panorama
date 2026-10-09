using Microsoft.AspNetCore.Mvc;
using unnamed_site_backend.Contracts.Tags;
using unnamed_site_backend.Services;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/tags")]
public sealed class TagsController(ITagService tagService) : ControllerBase
{
    private readonly ITagService _tagService = tagService;

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending([FromQuery] int period = 30, [FromQuery] int limit = 10, CancellationToken cancellationToken = default)
    {
        var result = await _tagService.GetTrendingTagsAsync(period, limit, cancellationToken);
        return Ok(result);
    }
}
