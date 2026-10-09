using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using unnamed_site_backend.Authentication;
using unnamed_site_backend.Contracts.Auth;
using unnamed_site_backend.Models;
using unnamed_site_backend.Security;

namespace unnamed_site_backend.Services;

public sealed class AuthenticationService(
    IUserService userService,
    IPasswordHasher<UserCredentials> passwordHasher,
    IJwtTokenService jwtTokenService) : IAuthenticationService
{
    private readonly IUserService _userService = userService;
    private readonly IPasswordHasher<UserCredentials> _passwordHasher = passwordHasher;
    private readonly IJwtTokenService _jwtTokenService = jwtTokenService;

    public async Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var identifier = request.UsernameOrEmail.Trim();
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(password))
        {
            return new LoginResult(LoginOutcome.InvalidCredentials, null, null);
        }

        var credentials = await _userService.GetCredentialsByIdentifierAsync(identifier, cancellationToken);
        if (credentials is null || !credentials.IsActive || string.IsNullOrWhiteSpace(credentials.PasswordHash))
        {
            return new LoginResult(LoginOutcome.InvalidCredentials, null, null);
        }

        var now = DateTimeOffset.UtcNow;
        if (credentials.LockoutUntil is { } lockedUntil && lockedUntil > now)
        {
            return new LoginResult(LoginOutcome.LockedOut, null, lockedUntil - now);
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(credentials, credentials.PasswordHash, password);
        if (verificationResult != PasswordVerificationResult.Success && verificationResult != PasswordVerificationResult.SuccessRehashNeeded)
        {
            await _userService.RegisterFailedLoginAsync(credentials.Id, cancellationToken);
            return new LoginResult(LoginOutcome.InvalidCredentials, null, null);
        }

        await _userService.RegisterSuccessfulLoginAsync(credentials.Id, cancellationToken);

        var infoMap = await _userService.GetInfoByIdsAsync([credentials.Id], cancellationToken);
        infoMap.TryGetValue(credentials.Id, out var info);

        var displayName = info?.DisplayName ?? credentials.Username;
        var labels = UserProfileFields.DeserializeLabels(info?.LabelsJson);
        var token = _jwtTokenService.CreateAccessToken(credentials, displayName);
        var authenticatedUser = CreateAuthenticatedUserResponse(
            credentials,
            displayName,
            info?.ProfilePicUrl ?? string.Empty,
            info?.ProfileDescription ?? string.Empty,
            info?.Gender ?? string.Empty,
            labels,
            info?.Age,
            info?.Nationality ?? string.Empty);

        var response = new LoginResponse(
            token.AccessToken,
            "Bearer",
            token.ExpiresAt,
            authenticatedUser);
        return new LoginResult(LoginOutcome.Success, response, null);
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        var existingByEmail = await _userService.GetCredentialsByIdentifierAsync(email, cancellationToken);
        if (existingByEmail is not null)
        {
            return null;
        }

        var username = await GenerateAvailableUsernameAsync(cancellationToken);

        var credentials = new UserCredentials
        {
            Username = username,
            Email = email,
            CreatedAt = DateTimeOffset.UtcNow,
            IsActive = true,
            Role = RoleNames.User,
            PasswordHash = _passwordHasher.HashPassword(new UserCredentials(), password)
        };

        await _userService.CreateUserWithInfoAsync(credentials, username, cancellationToken);

        var token = _jwtTokenService.CreateAccessToken(credentials, username);
        var authenticatedUser = CreateAuthenticatedUserResponse(
            credentials,
            username,
            string.Empty,
            string.Empty,
            string.Empty,
            Array.Empty<string>(),
            null,
            string.Empty);

        return new LoginResponse(
            token.AccessToken,
            "Bearer",
            token.ExpiresAt,
            authenticatedUser);
    }

    private async Task<string> GenerateAvailableUsernameAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var candidate = $"user{RandomNumberGenerator.GetInt32(1_000_000, 10_000_000)}";
            var existing = await _userService.GetCredentialsByUsernameAsync(candidate, cancellationToken);

            if (existing is null)
            {
                return candidate;
            }
        }

        return $"user{RandomNumberGenerator.GetInt32(int.MaxValue)}";
    }

    private static AuthenticatedUserResponse CreateAuthenticatedUserResponse(
        UserCredentials credentials,
        string displayName,
        string profilePicUrl,
        string profileDescription,
        string gender,
        IReadOnlyList<string> labels,
        int? age,
        string nationality)
    {
        return new AuthenticatedUserResponse(
            credentials.Id,
            credentials.Username,
            credentials.Email,
            displayName,
            profileDescription,
            gender,
            labels,
            age,
            nationality,
            credentials.Role ?? RoleNames.User,
            profilePicUrl);
    }
}