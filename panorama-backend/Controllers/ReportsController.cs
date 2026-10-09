using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Net.Http.Json;
using unnamed_site_backend.Data;
using unnamed_site_backend.Controllers.Extensions;
using unnamed_site_backend.Models;
using unnamed_site_backend.Security;

namespace unnamed_site_backend.Controllers;

[ApiController]
[Route("api/reports")]
public sealed class ReportsController(
    AppDbContext dbContext,
    IMemoryCache cache,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    IIpHasher ipHasher,
    ILogger<ReportsController> logger) : ControllerBase
{
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IMemoryCache _cache = cache;
    private readonly IConfiguration _configuration = configuration;
    private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
    private readonly IIpHasher _ipHasher = ipHasher;
    private readonly ILogger<ReportsController> _logger = logger;

    public sealed record CreateReportRequest(
        [property: Required, StringLength(50)] string ResourceType,
        [property: Range(1, int.MaxValue)] int ResourceId,
        [property: Required, StringLength(100)] string Reason,
        [property: StringLength(2000)] string? Details,
        [property: EmailAddress, StringLength(254)] string? ReporterEmail,
        object? Metadata,
        string? CaptchaToken);

    public sealed record PatchReportRequest(
        [property: StringLength(50)] string? Status,
        int? HandledBy);

    public sealed record ReportResponse(
        int Id,
        string ResourceType,
        int ResourceId,
        int? ReporterUserId,
        string? ReporterIp,
        string Reason,
        string? Details,
        string Status,
        DateTimeOffset CreatedAt);

    [HttpPost]
    [EnableRateLimiting("reports")]
    public async Task<IActionResult> CreateReport([FromBody] CreateReportRequest request, CancellationToken cancellationToken)
    {
        var reporterUserId = this.GetUserId();

        // If anonymous reporter, validate captcha and apply rate limit
        if (reporterUserId is null)
        {
            var captchaSecret = _configuration["Recaptcha:Secret"]; // set this in configuration or env
            if (string.IsNullOrWhiteSpace(captchaSecret) || string.IsNullOrWhiteSpace(request.CaptchaToken))
            {
                return BadRequest(new { message = "Captcha required for anonymous reports." });
            }

            var captchaOk = await VerifyRecaptchaAsync(request.CaptchaToken, captchaSecret);
            if (!captchaOk)
            {
                return BadRequest(new { message = "Captcha verification failed." });
            }

            // Rate limit by hashed IP (raw IP never enters the cache key).
            var ipHash = _ipHasher.Hash(HttpContext.Connection.RemoteIpAddress?.ToString()) ?? "unknown";
            var limit = int.TryParse(_configuration["Reports:AnonymousLimit"], out var l) ? l : 5;
            var windowMinutes = int.TryParse(_configuration["Reports:WindowMinutes"], out var w) ? w : 60;
            var cacheKey = $"reports:anon:{ipHash}";
            var current = _cache.Get<int?>(cacheKey) ?? 0;
            if (current >= limit)
            {
                return StatusCode(429, new { message = "Too many reports from this IP. Try later." });
            }

            _cache.Set(cacheKey, current + 1, TimeSpan.FromMinutes(windowMinutes));
        }

        var report = new Report
        {
            ResourceType = request.ResourceType ?? string.Empty,
            ResourceId = request.ResourceId,
            ReporterUserId = reporterUserId,
            ReporterIp = _ipHasher.Hash(HttpContext.Connection.RemoteIpAddress?.ToString()),
            ReporterEmail = request.ReporterEmail,
            Reason = request.Reason ?? string.Empty,
            Details = request.Details,
            MetadataJson = request.Metadata is null ? null : System.Text.Json.JsonSerializer.Serialize(request.Metadata),
            Status = "new",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        _dbContext.Reports.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new ReportResponse(report.Id, report.ResourceType, report.ResourceId, report.ReporterUserId, report.ReporterIp, report.Reason, report.Details, report.Status, report.CreatedAt));
    }

    private async Task<bool> VerifyRecaptchaAsync(string token, string secret)
    {
        try
        {
            var http = _httpClientFactory.CreateClient();
            var values = new Dictionary<string, string>
            {
                ["secret"] = secret,
                ["response"] = token,
            };
            using var content = new FormUrlEncodedContent(values);
            using var res = await http.PostAsync("https://www.google.com/recaptcha/api/siteverify", content);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Recaptcha siteverify returned non-success status {Status}", res.StatusCode);
                return false;
            }
            var obj = await res.Content.ReadFromJsonAsync<JsonElement>();
            if (obj.TryGetProperty("success", out var success)) return success.GetBoolean();
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Recaptcha verification failed");
            return false;
        }
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpGet]
    public async Task<IActionResult> GetReports([FromQuery] string? resourceType, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var q = _dbContext.Reports.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(resourceType)) q = q.Where(r => r.ResourceType == resourceType);
        if (!string.IsNullOrEmpty(status)) q = q.Where(r => r.Status == status);

        var items = await q.OrderByDescending(r => r.CreatedAt).Take(200).ToListAsync(cancellationToken);

        var resp = items.Select(r => new ReportResponse(r.Id, r.ResourceType, r.ResourceId, r.ReporterUserId, r.ReporterIp, r.Reason, r.Details, r.Status, r.CreatedAt));
        return Ok(new { items = resp });
    }

    [Authorize(Roles = RoleNames.Admin)]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> PatchReport(int id, [FromBody] PatchReportRequest body, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Reports.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (existing is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(body.Status)) existing.Status = body.Status;

        if (body.HandledBy.HasValue)
        {
            // Confirm the handler exists and is an admin before recording the assignment.
            var isAdmin = await _dbContext.UserCredentials
                .AsNoTracking()
                .AnyAsync(u => u.Id == body.HandledBy.Value && u.Role == RoleNames.Admin, cancellationToken);
            if (!isAdmin) return BadRequest(new { message = "handledBy must reference an admin user." });
            existing.HandledBy = body.HandledBy.Value;
        }

        existing.HandledAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok();
    }
}
