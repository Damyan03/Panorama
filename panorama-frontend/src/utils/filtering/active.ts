/**
 * Filters items that are active (visible) at the given elapsed time.
 * An item is active if elapsedMs falls between its startTime and the
 * derived item end. Duration is preferred over endTime when present.
 */
export function filterActiveItems<
	T extends { startTime: number; endTime?: number; duration?: number },
>(items: T[] | undefined, elapsedMs: number): T[] {
	if (!items) return [];

	return items.filter((item) => {
		const itemEnd =
			typeof item.duration === 'number' && Number.isFinite(item.duration)
				? item.startTime + Math.max(0, item.duration)
				: typeof item.endTime === 'number' &&
					  Number.isFinite(item.endTime)
					? Math.max(item.startTime, item.endTime)
					: item.startTime;
		return elapsedMs >= item.startTime && elapsedMs <= itemEnd;
	});
}
