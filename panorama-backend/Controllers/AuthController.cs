using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using unnamed_site_backend.Contracts.Auth;
using unnamed_site_backend.Security;
using unnamed_site_backend.Services;
using unnamed_site_backend.Controllers.Extensions;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthenticationService authenticationService, IUserService userService) : ControllerBase
{
    private readonly IAuthenticationService _authenticationService = authenticationService;
    private readonly IUserService _userService = userService;

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _authenticationService.LoginAsync(request, cancellationToken);
        switch (result.Outcome)
        {
            case LoginOutcome.Success:
                return Ok(result.Response);
            case LoginOutcome.LockedOut:
                if (result.RetryAfter is { } retryAfter)
                {
                    Response.Headers["Retry-After"] = ((int)retryAfter.TotalSeconds).ToString();
                }
                return StatusCode(StatusCodes.Status423Locked, new
                {
                    message = "Account temporarily locked due to repeated failed logins.",
                });
            default:
                return Unauthorized(new { message = "Invalid username/email or password." });
        }
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var response = await _authenticationService.RegisterAsync(request, cancellationToken);
        return response is null
            ? BadRequest(new { message = "Unable to register. Please check your details and try again." })
            : Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (this.GetUserId() is not int userId)
        {
            return Unauthorized(new { message = "Invalid token." });
        }

        // Source of truth is the DB — JWT claims may be stale after a profile
        // update (we don't reissue tokens on settings change).
        var credentials = await _userService.GetCredentialsByIdAsync(userId, cancellationToken);
        if (credentials is null || !credentials.IsActive)
        {
            return Unauthorized(new { message = "User no longer available." });
        }

        var infoMap = await _userService.GetInfoByIdsAsync([userId], cancellationToken);
        infoMap.TryGetValue(userId, out var info);
        var labels = UserProfileFields.DeserializeLabels(info?.LabelsJson);

        return Ok(new AuthenticatedUserResponse(
            credentials.Id,
            credentials.Username,
            credentials.Email,
            info?.DisplayName ?? credentials.Username,
            info?.ProfileDescription ?? string.Empty,
            info?.Gender ?? string.Empty,
            labels,
            info?.Age,
            info?.Nationality ?? string.Empty,
            credentials.Role,
            info?.ProfilePicUrl ?? string.Empty));
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpGet("admin-check")]
    public IActionResult AdminCheck()
    {
        return Ok(new { message = "Admin access granted." });
    }
}