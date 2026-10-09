import type { AnimationConfig } from './text';

export interface ActiveAnimation {
	animation: AnimationConfig;
	progress: number;
}

/**
 * Finds the animation that is active at the current time.
 * Sequential animations run in declaration order, one after another.
 */
export function findActiveAnimation(
	animations: AnimationConfig[] | undefined,
	elapsedSinceStart: number,
): ActiveAnimation | null {
	if (!animations) return null;

	let currentTime = 0;

	for (const anim of animations) {
		const animStart = currentTime;
		const animEnd = currentTime + anim.duration;

		if (elapsedSinceStart >= animStart && elapsedSinceStart < animEnd) {
			const progress = (elapsedSinceStart - animStart) / anim.duration;
			return { animation: anim, progress: Math.min(progress, 1) };
		}

		currentTime = animEnd;
	}

	return null;
}

/**
 * Returns the cumulative movement offset at a given time.
 * Completed move animations contribute their full delta; the active move animation contributes a partial delta.
 */
export function getMoveDeltaAtTime(
	animations: AnimationConfig[] | undefined,
	elapsedSinceStart: number,
): { left: number; top: number } {
	if (!animations) return { left: 0, top: 0 };

	const delta = { left: 0, top: 0 };
	let moveTime = 0;

	for (const anim of animations) {
		if (anim.type === 'move' && anim.to) {
			const animStart = moveTime;
			const animEnd = moveTime + anim.duration;

			if (elapsedSinceStart >= animEnd) {
				delta.left += anim.to.left;
				delta.top += anim.to.top;
			} else if (
				elapsedSinceStart >= animStart &&
				elapsedSinceStart < animEnd
			) {
				const progress =
					(elapsedSinceStart - animStart) / anim.duration;
				delta.left += anim.to.left * progress;
				delta.top += anim.to.top * progress;
				break;
			}

			moveTime = animEnd;
		}
	}

	return delta;
}
