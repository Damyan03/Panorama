/** Parse JSON, returning `fallback` if the input is missing or malformed. */
export function safeJsonParse<T>(
	input: string | null | undefined,
	fallback: T,
): T {
	if (input == null || input === '') return fallback;
	try {
		return JSON.parse(input) as T;
	} catch {
		return fallback;
	}
}
