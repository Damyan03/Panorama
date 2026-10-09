function isFiniteDelta(value: number) {
	return Number.isFinite(value) && value !== 0;
}

/**
 * Smoothly scrolls an element by deltaY pixels.
 */
export function smoothScrollElementBy(element: HTMLElement, deltaY: number) {
	if (!isFiniteDelta(deltaY)) {
		return;
	}

	const nextTop = element.scrollTop + deltaY;
	element.scrollTo({ top: nextTop, behavior: 'smooth' });
}

/**
 * Smoothly scrolls the page by deltaY pixels.
 */
export function smoothScrollWindowBy(deltaY: number) {
	if (!isFiniteDelta(deltaY)) {
		return;
	}

	window.scrollBy({ top: deltaY, behavior: 'smooth' });
}
