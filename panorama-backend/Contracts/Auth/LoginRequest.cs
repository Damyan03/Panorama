using System.ComponentModel.DataAnnotations;

namespace unnamed_site_backend.Contracts.Auth;

public sealed record LoginRequest
{
    [Required]
    public string UsernameOrEmail { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}