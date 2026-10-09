namespace unnamed_site_backend.Contracts.Users;

public sealed record UserSettingsResponse(
    int Id,
    string Username,
    string Email,
    string DisplayName,
    string ProfilePicUrl,
    string ProfileDescription,
    string Gender,
    IReadOnlyList<string> Labels,
    int? Age,
    string Nationality,
    string Role,
    DateTimeOffset JoinedAt);
