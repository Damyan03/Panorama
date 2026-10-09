using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace unnamed_site_backend.Controllers.Extensions;

public static class ControllerExtensions
{
    public static int? GetUserId(this ControllerBase controller)
    {
        var userIdClaim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    public static async Task<IActionResult> ExecuteSafelyAsync(this ControllerBase controller, Func<Task<IActionResult>> action, string logPrefix = "", string userMessage = "An internal error occurred.")
    {
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            var logger = controller.HttpContext.RequestServices.GetService(typeof(ILoggerFactory)) as ILoggerFactory;
            logger?.CreateLogger(controller.GetType()).LogError(ex, "{Prefix}Unhandled controller exception", logPrefix);
            return controller.StatusCode(500, new { message = userMessage });
        }
    }
}
