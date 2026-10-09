namespace unnamed_site_backend.Contracts.Videos;

public sealed record VideoListQuery(
	int Page = 1,
	int PageSize = 30,
	string Status = "uploaded",
	string? Tag = null,
	string? Sort = null,
	int? Period = null,
	IReadOnlyList<string>? PreferredTags = null,
	IReadOnlyList<string>? HiddenTags = null,
	int? TimeRangeDays = null,
	int? MinDurationMinutes = null,
	int? MaxDurationMinutes = null,
	string? Search = null);