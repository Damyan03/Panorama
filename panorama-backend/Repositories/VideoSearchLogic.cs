using Microsoft.EntityFrameworkCore;
using System.Text;
using unnamed_site_backend.Models;

namespace unnamed_site_backend.Repositories;

internal static class VideoSearchLogic
{
    private const int MinSearchTokenLength = 2;
    private const int MaxSearchTokens = 8;

    internal sealed record SearchTerms(string[] TextTokens, string[] TagTokens)
    {
        internal bool HasSearch => TextTokens.Length > 0 || TagTokens.Length > 0;
        internal bool HasText => TextTokens.Length > 0;
        internal string Phrase => string.Join(' ', TextTokens);
    }

    internal static SearchTerms ParseSearchTerms(string? search)
    {
        var normalizedSearch = NormalizeSearch(search);
        if (string.IsNullOrWhiteSpace(normalizedSearch))
        {
            return new SearchTerms([], []);
        }

        var tokens = SplitSearchTokens(normalizedSearch)
            .Take(MaxSearchTokens * 2)
            .ToArray();

        var tagTokens = tokens
            .Where(token => token.StartsWith('#'))
            .Select(token => NormalizeSearchToken(token[1..]))
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxSearchTokens)
            .ToArray();

        var textTokens = tokens
            .Where(token => !token.StartsWith('#'))
            .Select(NormalizeSearchToken)
            .Where(token => token.Length >= MinSearchTokenLength)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxSearchTokens)
            .ToArray();

        return new SearchTerms(textTokens, tagTokens);
    }

    internal static IQueryable<Video> ApplySearchFilters(
        IQueryable<Video> videoQuery,
        SearchTerms searchTerms)
    {
        foreach (var tagToken in searchTerms.TagTokens)
        {
            var pattern = BuildContainsPattern(tagToken);
            videoQuery = videoQuery.Where(video =>
                video.Tags.Any(tag => EF.Functions.ILike(tag.Name, pattern)));
        }

        if (!searchTerms.HasText)
        {
            return videoQuery;
        }

        var phrasePattern = BuildContainsPattern(searchTerms.Phrase);
        var anyTermTsQuery = BuildAnyPrefixTsQuery(searchTerms.TextTokens);

        if (!string.IsNullOrWhiteSpace(anyTermTsQuery))
        {
            videoQuery = videoQuery.Where(video =>
                EF.Functions.ToTsVector("english", video.Title)
                    .Matches(EF.Functions.ToTsQuery("english", anyTermTsQuery))
                || video.Tags.Any(tag =>
                    EF.Functions.ToTsVector("simple", tag.Name)
                        .Matches(EF.Functions.ToTsQuery("simple", anyTermTsQuery)))
                || EF.Functions.ILike(video.Title, phrasePattern)
                || video.Tags.Any(tag => EF.Functions.ILike(tag.Name, phrasePattern)));
        }
        else
        {
            videoQuery = videoQuery.Where(video =>
                EF.Functions.ILike(video.Title, phrasePattern)
                || video.Tags.Any(tag => EF.Functions.ILike(tag.Name, phrasePattern)));
        }

        foreach (var term in searchTerms.TextTokens)
        {
            var tokenPattern = BuildContainsPattern(term);
            var tokenPrefixTsQuery = $"{term}:*";

            videoQuery = videoQuery.Where(video =>
                EF.Functions.ILike(video.Title, tokenPattern)
                || video.Tags.Any(tag => EF.Functions.ILike(tag.Name, tokenPattern))
                || EF.Functions.ToTsVector("english", video.Title)
                    .Matches(EF.Functions.ToTsQuery("english", tokenPrefixTsQuery))
                || video.Tags.Any(tag =>
                    EF.Functions.ToTsVector("simple", tag.Name)
                        .Matches(EF.Functions.ToTsQuery("simple", tokenPrefixTsQuery))));
        }

        return videoQuery;
    }

    internal static double ComputeSearchScore(Video video, SearchTerms searchTerms)
    {
        var normalizedTitle = NormalizeSearch(video.Title);
        var titleTokens = SplitSearchTokens(normalizedTitle)
            .Select(NormalizeSearchToken)
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .ToArray();
        var tagTokens = video.Tags
            .SelectMany(tag => SplitSearchTokens(NormalizeSearch(tag.Name)))
            .Select(NormalizeSearchToken)
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var score = 0d;

        if (searchTerms.HasText)
        {
            var phrase = searchTerms.Phrase;
            if (normalizedTitle.Equals(phrase, StringComparison.Ordinal))
            {
                score += 50;
            }
            else if (normalizedTitle.StartsWith(phrase, StringComparison.Ordinal))
            {
                score += 30;
            }
            else if (normalizedTitle.Contains(phrase, StringComparison.Ordinal))
            {
                score += 20;
            }

            var matchedTextTerms = 0;

            foreach (var token in searchTerms.TextTokens)
            {
                var matched = false;

                if (titleTokens.Contains(token, StringComparer.Ordinal))
                {
                    score += 16;
                    matched = true;
                }
                else if (titleTokens.Any(value => value.StartsWith(token, StringComparison.Ordinal)))
                {
                    score += 12;
                    matched = true;
                }
                else if (normalizedTitle.Contains(token, StringComparison.Ordinal))
                {
                    score += 9;
                    matched = true;
                }

                if (tagTokens.Contains(token, StringComparer.Ordinal))
                {
                    score += 10;
                    matched = true;
                }
                else if (tagTokens.Any(value => value.StartsWith(token, StringComparison.Ordinal)))
                {
                    score += 8;
                    matched = true;
                }
                else if (tagTokens.Any(value => value.Contains(token, StringComparison.Ordinal)))
                {
                    score += 5;
                    matched = true;
                }

                var fuzzySimilarity = Math.Max(
                    GetBestTokenSimilarity(token, titleTokens),
                    GetBestTokenSimilarity(token, tagTokens));

                if (fuzzySimilarity >= 0.78)
                {
                    score += fuzzySimilarity * 8;
                    matched = true;
                }

                if (matched)
                {
                    matchedTextTerms++;
                }
            }

            score += (double)matchedTextTerms / searchTerms.TextTokens.Length * 25;
        }

        if (searchTerms.TagTokens.Length > 0)
        {
            var matchedTagTokens = 0;

            foreach (var token in searchTerms.TagTokens)
            {
                if (tagTokens.Contains(token, StringComparer.Ordinal))
                {
                    score += 18;
                    matchedTagTokens++;
                }
                else if (tagTokens.Any(value => value.StartsWith(token, StringComparison.Ordinal)))
                {
                    score += 12;
                    matchedTagTokens++;
                }
                else if (tagTokens.Any(value => value.Contains(token, StringComparison.Ordinal)))
                {
                    score += 9;
                    matchedTagTokens++;
                }
            }

            score += (double)matchedTagTokens / searchTerms.TagTokens.Length * 20;
        }

        return score;
    }

    private static string NormalizeSearch(string? search)
    {
        return search?.Trim().ToLowerInvariant() ?? string.Empty;
    }

    private static IEnumerable<string> SplitSearchTokens(string normalizedSearch)
    {
        var builder = new StringBuilder();

        foreach (var character in normalizedSearch)
        {
            if (char.IsLetterOrDigit(character) || character == '#' || character == '_')
            {
                builder.Append(character);
            }
            else if (builder.Length > 0)
            {
                yield return builder.ToString();
                builder.Clear();
            }
        }

        if (builder.Length > 0)
        {
            yield return builder.ToString();
        }
    }

    private static string NormalizeSearchToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(token.Length);
        foreach (var character in token.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character) || character == '_')
            {
                builder.Append(character);
            }
        }

        return builder.ToString();
    }

    private static string BuildContainsPattern(string value)
    {
        return $"%{EscapeLikePattern(value)}%";
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
    }

    private static string BuildAnyPrefixTsQuery(IEnumerable<string> tokens)
    {
        return string.Join(
            " | ",
            tokens
                .Select(NormalizeSearchToken)
                .Where(token => !string.IsNullOrWhiteSpace(token))
                .Select(token => $"{token}:*"));
    }

    private static double GetBestTokenSimilarity(string token, IEnumerable<string> candidates)
    {
        var best = 0d;
        foreach (var candidate in candidates)
        {
            if (Math.Abs(candidate.Length - token.Length) > Math.Max(3, token.Length / 2))
            {
                continue;
            }

            var similarity = CalculateNormalizedLevenshtein(token, candidate);
            if (similarity > best)
            {
                best = similarity;
            }
        }

        return best;
    }

    private static double CalculateNormalizedLevenshtein(string left, string right)
    {
        if (left.Length == 0 && right.Length == 0)
        {
            return 1;
        }

        if (left.Equals(right, StringComparison.Ordinal))
        {
            return 1;
        }

        var leftLength = left.Length;
        var rightLength = right.Length;
        var previousRow = new int[rightLength + 1];
        var currentRow = new int[rightLength + 1];

        for (var j = 0; j <= rightLength; j++)
        {
            previousRow[j] = j;
        }

        for (var i = 1; i <= leftLength; i++)
        {
            currentRow[0] = i;

            for (var j = 1; j <= rightLength; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;
                currentRow[j] = Math.Min(
                    Math.Min(currentRow[j - 1] + 1, previousRow[j] + 1),
                    previousRow[j - 1] + cost);
            }

            (previousRow, currentRow) = (currentRow, previousRow);
        }

        var distance = previousRow[rightLength];
        var maxLength = Math.Max(leftLength, rightLength);
        return 1d - (double)distance / maxLength;
    }
}