using Microsoft.EntityFrameworkCore;
using unnamed_site_backend.Models;
using unnamed_site_backend.Security;

namespace unnamed_site_backend.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<VideoLike> VideoLikes => Set<VideoLike>();
    public DbSet<UserFollow> UserFollows => Set<UserFollow>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<UserCredentials> UserCredentials => Set<UserCredentials>();
    public DbSet<UserInfo> UserInfos => Set<UserInfo>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Video>(entity =>
        {
            entity.ToTable("videos");
            entity.HasKey(video => video.Id);
            entity.ToTable(table => table.HasCheckConstraint("CK_videos_Status", "\"Status\" IN ('uploaded', 'draft')"));
            entity.Property(video => video.Status)
                .IsRequired()
                .HasMaxLength(20)
                .HasDefaultValue("uploaded");

            entity.Property(video => video.Title)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(video => video.Description)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(video => video.AuthorId)
                .IsRequired();

            entity.HasIndex(video => video.Status);
            entity.HasIndex(video => video.DayUploaded);
            entity.HasIndex(video => video.Views);
            entity.HasIndex(video => video.Title);

            entity.HasMany(c => c.Tags)
                .WithMany(t => t.Videos)
                .UsingEntity("video_tags");

            entity.Property(video => video.CoverSrc)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(video => video.ContentJson)
                .IsRequired()
                .HasColumnType("jsonb");
        });

        modelBuilder.Entity<UserCredentials>(entity =>
        {
            entity.ToTable("user_credentials");
            entity.HasKey(user => user.Id);

            entity.HasIndex(user => user.Username)
                .IsUnique();

            entity.HasIndex(user => user.Email)
                .IsUnique();

            entity.Property(user => user.Username)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(user => user.Email)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(user => user.PasswordHash)
                .HasMaxLength(500);

            entity.Property(user => user.CreatedAt)
                .IsRequired();

            entity.Property(user => user.UpdatedAt);

            entity.Property(user => user.IsActive)
                .HasDefaultValue(true);

            entity.Property(user => user.Role)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue(RoleNames.User);

            entity.Property(user => user.FailedLoginAttempts)
                .HasDefaultValue(0);

            entity.Property(user => user.LockoutUntil);

            entity.HasOne(user => user.Info)
                .WithOne(info => info.Credentials)
                .HasForeignKey<UserInfo>(info => info.Id)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserInfo>(entity =>
        {
            entity.ToTable("user_infos");
            entity.HasKey(user => user.Id);
            entity.ToTable(table => table.HasCheckConstraint("CK_user_infos_Age", "\"Age\" IS NULL OR (\"Age\" >= 13 AND \"Age\" <= 120)"));

            entity.Property(user => user.DisplayName)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(user => user.ProfilePicUrl)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(user => user.ProfileDescription)
                .IsRequired()
                .HasMaxLength(1000)
                .HasDefaultValue(string.Empty);

            entity.Property(user => user.Gender)
                .IsRequired()
                .HasMaxLength(60)
                .HasDefaultValue(string.Empty);

            entity.Property(user => user.LabelsJson)
                .IsRequired()
                .HasColumnType("jsonb")
                .HasDefaultValueSql("'[]'::jsonb");

            entity.Property(user => user.Age);

            entity.Property(user => user.Nationality)
                .IsRequired()
                .HasMaxLength(100)
                .HasDefaultValue(string.Empty);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(t => t.Id);
            entity.HasIndex(t => t.Name).IsUnique();

            entity.Property(t => t.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(t => t.CreatedAt)
                .IsRequired();
        });

        modelBuilder.Entity<VideoLike>(entity =>
        {
            entity.ToTable("video_likes");
            entity.HasKey(v => v.Id);
            entity.HasIndex(v => new { v.VideoId, v.UserId }).IsUnique();

            entity.Property(v => v.CreatedAt).IsRequired();

            entity.HasOne(v => v.Video)
                .WithMany(c => c.Likes)
                .HasForeignKey(v => v.VideoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserFollow>(entity =>
        {
            entity.ToTable("user_follows");
            entity.HasKey(f => f.Id);
            entity.ToTable(table => table.HasCheckConstraint("CK_user_follows_NoSelfFollow", "\"FollowerUserId\" <> \"FollowedUserId\""));

            entity.HasIndex(f => new { f.FollowerUserId, f.FollowedUserId })
                .IsUnique();

            entity.HasIndex(f => f.FollowedUserId);

            entity.Property(f => f.CreatedAt)
                .IsRequired();

            entity.HasOne<UserCredentials>()
                .WithMany()
                .HasForeignKey(f => f.FollowerUserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<UserCredentials>()
                .WithMany()
                .HasForeignKey(f => f.FollowedUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.ToTable("comments");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.ParentCommentId);
            entity.Property(c => c.Text).IsRequired().HasMaxLength(2000);
            entity.Property(c => c.CreatedAt).IsRequired();
            entity.Property(c => c.UpdatedAt);
            entity.HasIndex(c => new { c.VideoId, c.ParentCommentId, c.CreatedAt });

            entity.HasOne(c => c.ParentComment)
                .WithMany(c => c.Replies)
                .HasForeignKey(c => c.ParentCommentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Video)
                .WithMany(ch => ch.Comments)
                .HasForeignKey(c => c.VideoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.ToTable("reports");
            entity.HasKey(r => r.Id);

            entity.Property(r => r.ResourceType)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(r => r.Reason)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(r => r.MetadataJson)
                .HasColumnType("jsonb");

            entity.Property(r => r.Status)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue("new");

            entity.Property(r => r.CreatedAt)
                .IsRequired();

            entity.HasOne<UserInfo>()
                .WithMany()
                .HasForeignKey("HandledBy")
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static readonly HashSet<string> AllowedSequenceTables = new(StringComparer.Ordinal)
    {
        "tags",
        "videos",
        "video_likes",
        "user_follows",
        "user_credentials",
        "user_infos",
        "comments",
        "reports"
    };

    private static readonly HashSet<string> AllowedSequenceColumns = new(StringComparer.Ordinal)
    {
        "Id"
    };

    public async Task SyncSequenceAsync(string tableName, string columnName, CancellationToken cancellationToken = default)
    {
        // Whitelist guards against SQL injection because the identifiers are
        // interpolated into raw SQL (Npgsql cannot parameterise identifiers).
        if (!AllowedSequenceTables.Contains(tableName))
            throw new ArgumentException($"Unknown sequence table: {tableName}", nameof(tableName));
        if (!AllowedSequenceColumns.Contains(columnName))
            throw new ArgumentException($"Unknown sequence column: {columnName}", nameof(columnName));

        var sql = $"SELECT setval(pg_get_serial_sequence('{tableName}', '{columnName}'), COALESCE(MAX(\"{columnName}\"), 0) + 1, false) FROM {tableName};";
        await Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}
