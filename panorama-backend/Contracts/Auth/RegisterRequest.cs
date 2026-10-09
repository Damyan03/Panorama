using System.ComponentModel.DataAnnotations;

namespace unnamed_site_backend.Contracts.Auth;

public sealed record RegisterRequest
{
    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}
