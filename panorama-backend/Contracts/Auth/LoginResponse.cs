namespace unnamed_site_backend.Contracts.Auth;

public sealed record LoginResponse(
    string AccessToken,
    string TokenType,
    DateTimeOffset ExpiresAt,
    AuthenticatedUserResponse User);