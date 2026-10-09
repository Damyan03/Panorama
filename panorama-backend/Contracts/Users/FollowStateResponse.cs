namespace unnamed_site_backend.Contracts.Users;

public sealed record FollowStateResponse(
    bool IsFollowing,
    int FollowerCount,
    int FollowingCount);