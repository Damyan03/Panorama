namespace unnamed_site_backend.Contracts.Users;

public sealed record PublicUserResponse(
    int Id,
    string Username,
    string DisplayName,
    string ProfilePicUrl,
    string ProfileDescription,
    string Gender,
    IReadOnlyList<string> Labels,
    int? Age,
    string Nationality,
    string Role,
    DateTimeOffset JoinedAt,
    int VideoCount,
    int TotalLikes,
    int TotalViews,
    int FollowerCount,
    int FollowingCount,
    bool IsFollowedByCurrentUser,
    IReadOnlyList<PublicUserVideo> RecentVideos);

public sealed record PublicUserVideo(
    int Id,
    string Title,
    string CoverSrc,
    DateTimeOffset DayUploaded,
    int Views,
    int Likes,
    int TotalDuration);
