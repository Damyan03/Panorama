namespace unnamed_site_backend.Contracts.Auth;

public sealed record AuthenticatedUserResponse(
    int Id,
    string Username,
    string Email,
    string DisplayName,
    string ProfileDescription,
    string Gender,
    IReadOnlyList<string> Labels,
    int? Age,
    string Nationality,
    string Role,
    string ProfilePicUrl);