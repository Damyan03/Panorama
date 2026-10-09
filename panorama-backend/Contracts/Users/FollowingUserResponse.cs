namespace unnamed_site_backend.Contracts.Users;

public sealed record FollowingUserResponse(
    int Id,
    string Username,
    string DisplayName,
    string ProfilePicUrl,
    DateTimeOffset FollowedAt);