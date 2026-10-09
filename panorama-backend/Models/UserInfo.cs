namespace unnamed_site_backend.Models;

public sealed class UserInfo
{
    public int Id { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string ProfilePicUrl { get; set; } = string.Empty;

    public string ProfileDescription { get; set; } = string.Empty;

    public string Gender { get; set; } = string.Empty;

    public string LabelsJson { get; set; } = "[]";

    public int? Age { get; set; }

    public string Nationality { get; set; } = string.Empty;

    public UserCredentials? Credentials { get; set; }
}