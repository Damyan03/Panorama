namespace unnamed_site_backend.Authentication;

public sealed record JwtTokenResult(string AccessToken, DateTimeOffset ExpiresAt);