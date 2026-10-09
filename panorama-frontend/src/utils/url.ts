type QueryValue = string | number | boolean | null | undefined;

/**
 * Build a query string from an object, skipping `null`/`undefined`/`''` values.
 * Arrays are joined with commas. Returns `''` when there are no params.
 */
export function buildQueryString(
	params: Record<string, QueryValue | readonly QueryValue[]>,
): string {
	const search = new URLSearchParams();
	for (const [key, raw] of Object.entries(params)) {
		if (raw == null) continue;
		if (Array.isArray(raw)) {
			const joined = raw.filter((v) => v != null && v !== '').join(',');
			if (joined) search.set(key, joined);
			continue;
		}
		const value = String(raw);
		if (value === '') continue;
		search.set(key, value);
	}
	const qs = search.toString();
	return qs ? `?${qs}` : '';
}
