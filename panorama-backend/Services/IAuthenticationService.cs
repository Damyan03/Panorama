using unnamed_site_backend.Contracts.Auth;

namespace unnamed_site_backend.Services;

public enum LoginOutcome
{
    Success,
    InvalidCredentials,
    LockedOut,
}

public readonly record struct LoginResult(LoginOutcome Outcome, LoginResponse? Response, TimeSpan? RetryAfter);

public interface IAuthenticationService
{
    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<LoginResponse?> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
}