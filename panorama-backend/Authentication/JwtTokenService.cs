using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using unnamed_site_backend.Models;
using unnamed_site_backend.Security;

namespace unnamed_site_backend.Authentication;

public sealed class JwtTokenService(JwtOptions jwtOptions) : IJwtTokenService
{
    private static readonly JwtSecurityTokenHandler TokenHandler = new();
    private readonly JwtOptions _jwtOptions = jwtOptions;

    public JwtTokenResult CreateAccessToken(UserCredentials user, string? displayName = null)
    {
        var issuedAt = DateTimeOffset.UtcNow;
        var expiresAt = issuedAt.AddMinutes(_jwtOptions.AccessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new(ClaimTypes.Role, string.IsNullOrWhiteSpace(user.Role) ? RoleNames.User : user.Role)
        };

        if (!string.IsNullOrWhiteSpace(displayName))
        {
            claims.Add(new Claim("display_name", displayName));
        }

        claims.Add(new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")));

        var signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: signingCredentials);

        return new JwtTokenResult(TokenHandler.WriteToken(token), expiresAt);
    }
}