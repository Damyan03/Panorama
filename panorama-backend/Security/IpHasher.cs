using System.Security.Cryptography;
using System.Text;
using unnamed_site_backend.Authentication;

namespace unnamed_site_backend.Security;

/// <summary>
/// One-way HMAC-SHA256 hashing for client IPs so they can be retained for
/// abuse-detection without storing raw PII.
/// </summary>
public interface IIpHasher
{
    string? Hash(string? ip);
}

public sealed class IpHasher : IIpHasher
{
    private const string DomainSeparator = "ip-hasher:v1";
    private readonly byte[] _key;

    public IpHasher(IConfiguration configuration, JwtOptions jwtOptions)
    {
        var configured = configuration["Security:IpHashSecret"];
        // Falls back to a deterministic value derived from the JWT signing key so deployments
        // that haven't set a dedicated secret still get a stable, secret-derived hash.
        var seed = !string.IsNullOrWhiteSpace(configured) && Encoding.UTF8.GetByteCount(configured) >= 32
            ? configured
            : DomainSeparator + jwtOptions.SigningKey;
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(seed));
    }

    public string? Hash(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return null;
        var bytes = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(ip));
        return Convert.ToHexString(bytes);
    }
}

