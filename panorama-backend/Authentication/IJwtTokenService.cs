using unnamed_site_backend.Models;

namespace unnamed_site_backend.Authentication;

public interface IJwtTokenService
{
    JwtTokenResult CreateAccessToken(UserCredentials user, string? displayName = null);
}