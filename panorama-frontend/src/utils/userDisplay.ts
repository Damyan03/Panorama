/** First non-whitespace character of `name`, uppercased. Falls back to `?`. */
export function getInitial(name?: string | null): string {
	const ch = (name ?? '').trim().charAt(0);
	return ch ? ch.toUpperCase() : '?';
}
