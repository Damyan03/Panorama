using unnamed_site_backend.Models;

namespace unnamed_site_backend.Services;

public interface IUserService
{
    Task SeedTestUsersAsync(CancellationToken cancellationToken = default);

    Task<UserCredentials?> GetCredentialsByIdentifierAsync(string identifier, CancellationToken cancellationToken = default);

    Task<UserCredentials?> GetCredentialsByUsernameAsync(string username, CancellationToken cancellationToken = default);

    Task<Dictionary<string, UserCredentials>> GetCredentialsByUsernamesAsync(IEnumerable<string> usernames, CancellationToken cancellationToken = default);

    Task<Dictionary<int, UserInfo>> GetInfoByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task<Dictionary<int, UserCredentials>> GetCredentialsByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task<Dictionary<int, string>> GetRolesByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task<Dictionary<int, (UserInfo? Info, string Role, string? Username)>> GetUserIdentityByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);

    Task CreateUserWithInfoAsync(UserCredentials credentials, string displayName, CancellationToken cancellationToken = default);

    /// <summary>Increment the failed-login counter and apply a lockout if the threshold is reached.</summary>
    Task RegisterFailedLoginAsync(int userId, CancellationToken cancellationToken = default);

    /// <summary>Reset the failed-login counter after a successful authentication.</summary>
    Task RegisterSuccessfulLoginAsync(int userId, CancellationToken cancellationToken = default);

    Task<UserCredentials?> GetCredentialsByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>Result of attempting to mutate user account fields (settings or password).</summary>
    enum UpdateUserOutcome { Success, NotFound, UsernameTaken, EmailTaken, InvalidCurrentPassword }

    /// <summary>Update the authenticated user's profile/account settings.</summary>
    Task<UpdateUserOutcome> UpdateUserSettingsAsync(
        int userId,
        string? displayName,
        string? username,
        string? email,
        string? profilePicUrl,
        string? profileDescription,
        string? gender,
        IReadOnlyList<string>? labels,
        int? age,
        bool clearAge,
        string? nationality,
        CancellationToken cancellationToken = default);

    /// <summary>Change the authenticated user's password after verifying the current one.</summary>
    Task<UpdateUserOutcome> ChangePasswordAsync(
        int userId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default);
}
