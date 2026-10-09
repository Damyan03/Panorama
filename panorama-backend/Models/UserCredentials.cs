using unnamed_site_backend.Security;

namespace unnamed_site_backend.Models;

public sealed class UserCredentials
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PasswordHash { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public string Role { get; set; } = RoleNames.User;

    /// <summary>Number of consecutive failed login attempts; reset on success.</summary>
    public int FailedLoginAttempts { get; set; }

    /// <summary>If set and in the future, login is blocked.</summary>
    public DateTimeOffset? LockoutUntil { get; set; }

    public UserInfo? Info { get; set; }
}