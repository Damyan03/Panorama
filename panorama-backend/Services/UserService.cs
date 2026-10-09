using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using unnamed_site_backend.Data;
using unnamed_site_backend.Models;
using unnamed_site_backend.Security;

namespace unnamed_site_backend.Services;

public sealed class UserService(AppDbContext dbContext, IWebHostEnvironment environment, IPasswordHasher<UserCredentials> passwordHasher) : IUserService
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IWebHostEnvironment _environment = environment;
    private readonly IPasswordHasher<UserCredentials> _passwordHasher = passwordHasher;

    public async Task SeedTestUsersAsync(CancellationToken cancellationToken = default)
    {
        var testDataDirectory = Path.Combine(_environment.ContentRootPath, "Data", "TestData");
        if (!Directory.Exists(testDataDirectory))
        {
            return;
        }

        var credentialsDirectory = Path.Combine(testDataDirectory, "UserCredentials");
        if (Directory.Exists(credentialsDirectory))
        {
            foreach (var filePath in Directory.EnumerateFiles(credentialsDirectory, "U*.json").OrderBy(Path.GetFileName))
            {
                var payload = await File.ReadAllTextAsync(filePath, cancellationToken);
                using var document = JsonDocument.Parse(payload);
                var root = document.RootElement;

                var userId = root.GetProperty("id").GetInt32();
                var existingCredentials = await _dbContext.UserCredentials.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

                if (existingCredentials is null)
                {
                    var credentials = new UserCredentials
                    {
                        Id = userId,
                        Username = root.GetProperty("username").GetString() ?? string.Empty,
                        Email = root.GetProperty("email").GetString() ?? string.Empty,
                        CreatedAt = DateTimeOffset.Parse(root.GetProperty("createdAt").GetString() ?? string.Empty),
                        IsActive = root.TryGetProperty("isActive", out var isActive) ? isActive.GetBoolean() : true,
                        Role = root.TryGetProperty("role", out var role) ? role.GetString() ?? RoleNames.User : RoleNames.User
                    };

                    if (root.TryGetProperty("passwordHash", out var passwordHash))
                    {
                        credentials.PasswordHash = passwordHash.GetString();
                    }
                    else if (root.TryGetProperty("password", out var password) && !string.IsNullOrWhiteSpace(password.GetString()))
                    {
                        credentials.PasswordHash = _passwordHasher.HashPassword(credentials, password.GetString()!);
                    }

                    _dbContext.UserCredentials.Add(credentials);
                }
                else
                {
                    existingCredentials.Username = root.GetProperty("username").GetString() ?? existingCredentials.Username;
                    existingCredentials.Email = root.GetProperty("email").GetString() ?? existingCredentials.Email;
                    existingCredentials.Role = root.TryGetProperty("role", out var role) ? role.GetString() ?? existingCredentials.Role : existingCredentials.Role;
                    existingCredentials.PasswordHash = root.TryGetProperty("passwordHash", out var passwordHash)
                        ? passwordHash.GetString()
                        : root.TryGetProperty("password", out var password) && !string.IsNullOrWhiteSpace(password.GetString())
                            ? _passwordHasher.HashPassword(existingCredentials, password.GetString()!)
                            : existingCredentials.PasswordHash;
                    existingCredentials.IsActive = root.TryGetProperty("isActive", out var isActive) ? isActive.GetBoolean() : existingCredentials.IsActive;
                }
            }
        }

        var infosDirectory = Path.Combine(testDataDirectory, "UserInfos");
        if (Directory.Exists(infosDirectory))
        {
            foreach (var filePath in Directory.EnumerateFiles(infosDirectory, "U*.json").OrderBy(Path.GetFileName))
            {
                var payload = await File.ReadAllTextAsync(filePath, cancellationToken);
                using var document = JsonDocument.Parse(payload);
                var root = document.RootElement;

                var userId = root.GetProperty("id").GetInt32();
                var existingInfo = await _dbContext.UserInfos.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

                if (existingInfo is null)
                {
                    var info = new UserInfo
                    {
                        Id = userId,
                        DisplayName = root.GetProperty("displayName").GetString() ?? string.Empty,
                        ProfilePicUrl = root.GetProperty("profilePicUrl").GetString() ?? string.Empty,
                        ProfileDescription = ReadOptionalString(root, "profileDescription"),
                        Gender = ReadOptionalString(root, "gender"),
                        LabelsJson = UserProfileFields.SerializeLabels(ReadOptionalLabels(root, "labels")),
                        Age = ReadOptionalInt(root, "age"),
                        Nationality = ReadOptionalString(root, "nationality")
                    };

                    _dbContext.UserInfos.Add(info);
                }
                else
                {
                    existingInfo.DisplayName = root.GetProperty("displayName").GetString() ?? existingInfo.DisplayName;
                    existingInfo.ProfilePicUrl = root.GetProperty("profilePicUrl").GetString() ?? existingInfo.ProfilePicUrl;
                    existingInfo.ProfileDescription = ReadOptionalString(root, "profileDescription", existingInfo.ProfileDescription);
                    existingInfo.Gender = ReadOptionalString(root, "gender", existingInfo.Gender);
                    var labels = ReadOptionalLabels(root, "labels");
                    if (labels is not null)
                    {
                        existingInfo.LabelsJson = UserProfileFields.SerializeLabels(labels);
                    }
                    existingInfo.Age = ReadOptionalInt(root, "age", existingInfo.Age);
                    existingInfo.Nationality = ReadOptionalString(root, "nationality", existingInfo.Nationality);
                }
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserCredentials?> GetCredentialsByIdentifierAsync(string identifier, CancellationToken cancellationToken = default)
    {
        var normalizedIdentifier = identifier.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(normalizedIdentifier))
        {
            return null;
        }

        var identifierPattern = EscapeLikePattern(normalizedIdentifier);

        return await _dbContext.UserCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(
                user =>
                    EF.Functions.ILike(user.Username, identifierPattern, "\\") ||
                    EF.Functions.ILike(user.Email, identifierPattern, "\\"),
                cancellationToken);
    }

    public async Task<UserCredentials?> GetCredentialsByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        var credentialsByUsername = await GetCredentialsByUsernamesAsync(new[] { username }, cancellationToken);
        return credentialsByUsername.TryGetValue(username, out var credentials) ? credentials : null;
    }

    public async Task<Dictionary<string, UserCredentials>> GetCredentialsByUsernamesAsync(IEnumerable<string> usernames, CancellationToken cancellationToken = default)
    {
        var usernameList = usernames
            .Where(username => !string.IsNullOrWhiteSpace(username))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (usernameList.Length == 0)
        {
            return new Dictionary<string, UserCredentials>(StringComparer.Ordinal);
        }

        return await _dbContext.UserCredentials
            .AsNoTracking()
            .Where(user => usernameList.Contains(user.Username))
            .ToDictionaryAsync(user => user.Username, cancellationToken);
    }

    public async Task<Dictionary<int, UserInfo>> GetInfoByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids
            .Distinct()
            .ToArray();

        if (idList.Length == 0)
        {
            return new Dictionary<int, UserInfo>();
        }

        return await _dbContext.UserInfos
            .AsNoTracking()
            .Where(user => idList.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, cancellationToken);
    }

    public async Task<Dictionary<int, UserCredentials>> GetCredentialsByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids
            .Distinct()
            .ToArray();

        if (idList.Length == 0)
        {
            return new Dictionary<int, UserCredentials>();
        }

        return await _dbContext.UserCredentials
            .AsNoTracking()
            .Where(user => idList.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, cancellationToken);
    }

    public async Task<Dictionary<int, string>> GetRolesByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids
            .Distinct()
            .ToArray();

        if (idList.Length == 0)
        {
            return new Dictionary<int, string>();
        }

        return await _dbContext.UserCredentials
            .AsNoTracking()
            .Where(user => idList.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user.Role, cancellationToken);
    }

    public async Task<Dictionary<int, (UserInfo? Info, string Role, string? Username)>> GetUserIdentityByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        var idList = ids
            .Distinct()
            .ToArray();

        if (idList.Length == 0)
        {
            return new Dictionary<int, (UserInfo?, string, string?)>();
        }

        var credentials = await _dbContext.UserCredentials
            .AsNoTracking()
            .Where(user => idList.Contains(user.Id) && user.IsActive)
            .ToDictionaryAsync(user => user.Id, cancellationToken);

        var activeIds = credentials.Keys.ToArray();

        var infos = await _dbContext.UserInfos
            .AsNoTracking()
            .Where(user => activeIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, cancellationToken);

        return idList.ToDictionary(
            id => id,
            id =>
            {
                var hasCredential = credentials.TryGetValue(id, out var credential);
                var userInfo = hasCredential && infos.TryGetValue(id, out var info)
                    ? info
                    : null;

                return (
                    userInfo,
                    hasCredential && credential is not null ? credential.Role : "User",
                    hasCredential && credential is not null ? credential.Username : null
                );
            });
    }

    public async Task CreateUserWithInfoAsync(UserCredentials credentials, string displayName, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        _dbContext.UserCredentials.Add(credentials);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var userInfo = new UserInfo
        {
            Id = credentials.Id,
            DisplayName = displayName ?? string.Empty,
            ProfilePicUrl = string.Empty,
            ProfileDescription = string.Empty,
            Gender = string.Empty,
            LabelsJson = UserProfileFields.SerializeLabels(Array.Empty<string>()),
            Age = null,
            Nationality = string.Empty
        };

        _dbContext.UserInfos.Add(userInfo);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
    }

    private const int LockoutThreshold = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    public async Task RegisterFailedLoginAsync(int userId, CancellationToken cancellationToken = default)
    {
        var credentials = await _dbContext.UserCredentials.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (credentials is null) return;

        credentials.FailedLoginAttempts++;
        if (credentials.FailedLoginAttempts >= LockoutThreshold)
        {
            credentials.LockoutUntil = DateTimeOffset.UtcNow.Add(LockoutDuration);
        }
        credentials.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RegisterSuccessfulLoginAsync(int userId, CancellationToken cancellationToken = default)
    {
        var credentials = await _dbContext.UserCredentials.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (credentials is null) return;

        if (credentials.FailedLoginAttempts == 0 && credentials.LockoutUntil is null) return;

        credentials.FailedLoginAttempts = 0;
        credentials.LockoutUntil = null;
        credentials.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<UserCredentials?> GetCredentialsByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return _dbContext.UserCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);
    }

    public async Task<IUserService.UpdateUserOutcome> UpdateUserSettingsAsync(
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
        CancellationToken cancellationToken = default)
    {
        var credentials = await _dbContext.UserCredentials.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (credentials is null) return IUserService.UpdateUserOutcome.NotFound;

        var info = await _dbContext.UserInfos.FirstOrDefaultAsync(i => i.Id == userId, cancellationToken);
        if (info is null)
        {
            info = new UserInfo
            {
                Id = userId,
                DisplayName = credentials.Username,
                ProfilePicUrl = string.Empty,
                ProfileDescription = string.Empty,
                Gender = string.Empty,
                LabelsJson = UserProfileFields.SerializeLabels(Array.Empty<string>()),
                Age = null,
                Nationality = string.Empty
            };
            _dbContext.UserInfos.Add(info);
        }

        if (!string.IsNullOrWhiteSpace(username))
        {
            var normalized = username.Trim();
            if (!string.Equals(normalized, credentials.Username, StringComparison.Ordinal))
            {
                var usernamePattern = EscapeLikePattern(normalized.ToLowerInvariant());
                var conflict = await _dbContext.UserCredentials
                    .AnyAsync(
                        u => u.Id != userId && EF.Functions.ILike(u.Username, usernamePattern, "\\"),
                        cancellationToken);
                if (conflict) return IUserService.UpdateUserOutcome.UsernameTaken;
                credentials.Username = normalized;
            }
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var normalized = email.Trim().ToLowerInvariant();
            if (!string.Equals(normalized, credentials.Email, StringComparison.Ordinal))
            {
                var emailPattern = EscapeLikePattern(normalized);
                var conflict = await _dbContext.UserCredentials
                    .AnyAsync(
                        u => u.Id != userId && EF.Functions.ILike(u.Email, emailPattern, "\\"),
                        cancellationToken);
                if (conflict) return IUserService.UpdateUserOutcome.EmailTaken;
                credentials.Email = normalized;
            }
        }

        if (displayName is not null)
        {
            info.DisplayName = displayName.Trim();
        }

        if (profilePicUrl is not null)
        {
            info.ProfilePicUrl = profilePicUrl.Trim();
        }

        if (profileDescription is not null)
        {
            info.ProfileDescription = profileDescription.Trim();
        }

        if (gender is not null)
        {
            info.Gender = gender.Trim();
        }

        if (labels is not null)
        {
            info.LabelsJson = UserProfileFields.SerializeLabels(labels);
        }

        if (clearAge)
        {
            info.Age = null;
        }
        else if (age.HasValue)
        {
            info.Age = age.Value;
        }

        if (nationality is not null)
        {
            info.Nationality = nationality.Trim();
        }

        credentials.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return IUserService.UpdateUserOutcome.Success;
    }

    public async Task<IUserService.UpdateUserOutcome> ChangePasswordAsync(
        int userId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        var credentials = await _dbContext.UserCredentials.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (credentials is null) return IUserService.UpdateUserOutcome.NotFound;

        if (string.IsNullOrWhiteSpace(credentials.PasswordHash))
        {
            return IUserService.UpdateUserOutcome.InvalidCurrentPassword;
        }

        var verification = _passwordHasher.VerifyHashedPassword(credentials, credentials.PasswordHash, currentPassword);
        if (verification != PasswordVerificationResult.Success && verification != PasswordVerificationResult.SuccessRehashNeeded)
        {
            return IUserService.UpdateUserOutcome.InvalidCurrentPassword;
        }

        credentials.PasswordHash = _passwordHasher.HashPassword(credentials, newPassword);
        credentials.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return IUserService.UpdateUserOutcome.Success;
    }

    private static string ReadOptionalString(JsonElement root, string propertyName, string fallback = "")
    {
        if (!root.TryGetProperty(propertyName, out var property) || property.ValueKind == JsonValueKind.Null)
        {
            return fallback;
        }

        return property.GetString()?.Trim() ?? fallback;
    }

    private static IReadOnlyList<string>? ReadOptionalLabels(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Null)
        {
            return Array.Empty<string>();
        }

        if (property.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<string>();
        }

        var labels = property
            .EnumerateArray()
            .Where(item => item.ValueKind == JsonValueKind.String)
            .Select(item => item.GetString() ?? string.Empty);

        return UserProfileFields.NormalizeLabels(labels);
    }

    private static int? ReadOptionalInt(JsonElement root, string propertyName, int? fallback = null)
    {
        if (!root.TryGetProperty(propertyName, out var property))
        {
            return fallback;
        }

        if (property.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number && property.TryGetInt32(out var value))
        {
            return value;
        }

        return fallback;
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }
}
