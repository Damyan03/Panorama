namespace unnamed_site_backend.Middleware;

/// <summary>
/// Applies a baseline set of OWASP-recommended security response headers.
/// CSP is intentionally conservative for an API surface; the SPA host should
/// set its own document-level CSP.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private readonly RequestDelegate _next = next;

    public Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["Cross-Origin-Resource-Policy"] = "cross-origin";
        // No 'unsafe-inline' / 'unsafe-eval' — JSON responses don't need any sources.
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";

        if (context.Request.Headers.ContainsKey("Authorization"))
        {
            headers["Cache-Control"] = "no-store";
            headers["Pragma"] = "no-cache";
        }

        return _next(context);
    }
}
