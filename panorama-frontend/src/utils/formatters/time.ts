/**
 * Format a date string into a relative time string
 * @param dateString ISO date string
 * @returns Relative time like "2 hours ago"
 */
export function getRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
	return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Format a date string into a short month-day-year label.
 * @param dateString ISO date string
 * @returns Formatted string like "Oct 9, 2020"
 */
export function formatDateShort(dateString: string): string {
	const date = new Date(dateString);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC',
	}).format(date);
}

/**
 * Format a date string as a "joined" label (full month + year).
 * @param dateString ISO date string
 * @returns Formatted string like "October 2020", or '' for invalid input.
 */
export function formatJoinDate(dateString: string): string {
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
	});
}

/**
 * Format milliseconds into MM:SS format
 * @param durationMs Duration in milliseconds
 * @returns Formatted string like "1:30"
 */
export function formatDurationMs(durationMs: number): string {
	const totalSeconds = Math.floor(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds into HH:MM:SS format
 * @param ms Duration in milliseconds
 * @returns Formatted string like "1:30:45"
 */
export function formatTimeMs(ms: number): string {
	const safeMs = Math.max(0, Math.floor(ms));
	const totalSeconds = Math.floor(safeMs / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
			.toString()
			.padStart(2, '0')}`;
	}

	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
