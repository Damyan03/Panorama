using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace unnamed_site_backend.Contracts.Videos;

public sealed record SaveDraftRequest
{
	[Required]
	public string Title { get; init; } = string.Empty;

	[Required]
	public string Description { get; init; } = string.Empty;

	[Required]
	public string[] Tags { get; init; } = [];

	[Required]
	public string CoverSrc { get; init; } = string.Empty;

	[Range(0, int.MaxValue)]
	public int TotalDuration { get; init; }

	[Required]
	public JsonElement Content { get; init; }
}