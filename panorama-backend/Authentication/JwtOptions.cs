namespace unnamed_site_backend.Authentication;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "unnamed-site-backend";

    public string Audience { get; set; } = "unnamed-site-frontend";

    public string SigningKey { get; set; } = string.Empty;

    public int AccessTokenLifetimeMinutes { get; set; } = 60;
}