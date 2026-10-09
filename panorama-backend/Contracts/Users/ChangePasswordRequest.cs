using System.ComponentModel.DataAnnotations;

namespace unnamed_site_backend.Contracts.Users;

public sealed record ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}
