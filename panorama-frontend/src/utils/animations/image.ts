import type { AnimationConfig } from './text';
import { formatPos } from '../formatters/position';
import { findActiveAnimation, getMoveDeltaAtTime } from './sequencer';

export interface ImageAnimationState {
	opacity: number;
	objectPosition: string;
}

export interface NumericPosition {
	left: number;
	top: number;
}

/**
 * Returns the opacity and crop position for an image at a given time.
 * Fade-in affects opacity; move animations affect the rendered object position.
 */
export function getImageAnimationStateAtTime(
	animations: AnimationConfig[] | undefined,
	elapsedSinceStart: number,
	basePosition: NumericPosition,
): ImageAnimationState {
	const activeAnim = findActiveAnimation(animations, elapsedSinceStart);
	const positionDelta = getMoveDeltaAtTime(animations, elapsedSinceStart);

	let opacity = 1;

	if (activeAnim) {
		const { animation, progress } = activeAnim;

		if (animation.type === 'fade-in') {
			opacity = progress;
		}
	}

	const finalLeft = basePosition.left + positionDelta.left;
	const finalTop = basePosition.top + positionDelta.top;

	return {
		opacity,
		objectPosition: `${formatPos(finalLeft)} ${formatPos(finalTop)}`,
	};
}
