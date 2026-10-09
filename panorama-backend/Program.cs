using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using unnamed_site_backend.Authentication;
using unnamed_site_backend.Data;
using unnamed_site_backend.Middleware;
using unnamed_site_backend.Models;
using unnamed_site_backend.Repositories;
using unnamed_site_backend.Security;
using unnamed_site_backend.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:DefaultConnection configuration.");

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
ValidateJwtOptions(jwtOptions);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton<IPasswordHasher<UserCredentials>, PasswordHasher<UserCredentials>>();
builder.Services.AddScoped<IVideoRepository, FileVideoRepository>();
builder.Services.AddScoped<IVideoService, VideoService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IImageService, ImageService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddSingleton<IIpHasher, IpHasher>();

// Health checks expose liveness (always 200 if process is up) and readiness (DB connectivity).
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database");

// CORS — locked down to an explicit allow-list. AllowAnyOrigin is never used because
// credentialed requests would be rejected by the browser anyway.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
    });
});

// Rate limiting — fixed window for sensitive auth endpoints; sliding window for reports.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    static string IpPartitionKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: IpPartitionKey(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }));

    options.AddPolicy("reports", httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: IpPartitionKey(httpContext),
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(5),
                SegmentsPerWindow = 5,
                QueueLimit = 0,
            }));

    options.AddPolicy("publicProfile", httpContext =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: IpPartitionKey(httpContext),
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0,
            }));
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure static file serving for uploaded images
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

await using (var scope = app.Services.CreateAsyncScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.EnsureCreatedAsync();

    var videoService = scope.ServiceProvider.GetRequiredService<IVideoService>();
    var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
    var tagService = scope.ServiceProvider.GetRequiredService<ITagService>();
    await userService.SeedTestUsersAsync();
    await tagService.SeedTestTagsAsync();
    await videoService.SeedTestVideoAsync();

    await dbContext.SyncSequenceAsync("tags", "Id");
    await dbContext.SyncSequenceAsync("videos", "Id");
    await dbContext.SyncSequenceAsync("video_likes", "Id");
    await dbContext.SyncSequenceAsync("user_credentials", "Id");
    await dbContext.SyncSequenceAsync("user_infos", "Id");
    await dbContext.SyncSequenceAsync("comments", "Id");
    await dbContext.SyncSequenceAsync("reports", "Id");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (allowedOrigins.Length > 0)
{
    app.UseCors();
}

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false,
});
app.MapHealthChecks("/health/ready");

app.MapControllers();

app.Run();

static void ValidateJwtOptions(JwtOptions options)
{
    if (string.IsNullOrWhiteSpace(options.SigningKey))
    {
        throw new InvalidOperationException("Missing Jwt:SigningKey configuration.");
    }

    if (Encoding.UTF8.GetByteCount(options.SigningKey) < 32)
    {
        throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes for HMAC-SHA256.");
    }

    if (string.IsNullOrWhiteSpace(options.Issuer))
    {
        throw new InvalidOperationException("Missing Jwt:Issuer configuration.");
    }

    if (string.IsNullOrWhiteSpace(options.Audience))
    {
        throw new InvalidOperationException("Missing Jwt:Audience configuration.");
    }

    if (options.AccessTokenLifetimeMinutes <= 0)
    {
        throw new InvalidOperationException("Jwt:AccessTokenLifetimeMinutes must be greater than zero.");
    }
}
