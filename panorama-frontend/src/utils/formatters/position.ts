type PosVal = number | string;

export interface Position {
	left: PosVal;
	top: PosVal;
}

/**
 * Convert a single position value to CSS format
 * 0-100 (or -100 to 100) = percentage, >100 = pixels
 */
export function formatPos(v: PosVal): string {
	if (typeof v === 'string') return v;

	// Treat numbers in range ±100 as percentages, otherwise pixels
	if (Math.abs(v) <= 100) return `${v}%`;
	return `${v}px`;
}

/**
 * Format position object for CSS positioning (left/top style)
 */
export function formatPositionStyle(position: Position): {
	left: string;
	top: string;
} {
	return {
		left: formatPos(position.left),
		top: formatPos(position.top),
	};
}

/**
 * Format position object for object-position (image cropping)
 */
export function formatObjectPosition(position: Position): string {
	return `${formatPos(position.left)} ${formatPos(position.top)}`;
}
