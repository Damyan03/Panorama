using System.ComponentModel.DataAnnotations;

namespace unnamed_site_backend.Contracts.Users;

/// <summary>
/// Patch-style update request for the authenticated user's profile settings.
/// All fields are optional; only fields present (non-null) are applied.
/// </summary>
public sealed record UpdateUserSettingsRequest
{
    [StringLength(200, MinimumLength = 1)]
    public string? DisplayName { get; init; }

    [StringLength(100, MinimumLength = 3)]
    [RegularExpression("^[a-zA-Z0-9_]+$", ErrorMessage = "Username may only contain letters, numbers, and underscores.")]
    public string? Username { get; init; }

    [EmailAddress]
    [StringLength(254)]
    public string? Email { get; init; }

    [StringLength(500)]
    public string? ProfilePicUrl { get; init; }

    [StringLength(1000)]
    public string? ProfileDescription { get; init; }

    [StringLength(60)]
    public string? Gender { get; init; }

    [MaxLength(8)]
    public string[]? Labels { get; init; }

    [Range(13, 120)]
    public int? Age { get; init; }

    public bool ClearAge { get; init; }

    [StringLength(100)]
    public string? Nationality { get; init; }
}
