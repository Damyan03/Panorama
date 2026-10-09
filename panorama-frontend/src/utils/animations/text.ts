export type AnimationType = 'fade-in' | 'typing' | 'move' | 'none';

import { findActiveAnimation, getMoveDeltaAtTime } from './sequencer';

export interface AnimationConfig {
	type: AnimationType;
	duration: number;
	to?: { left: number; top: number };
}

/**
 * Builds inline styles for the active animation phase.
 */
export function getAnimationStyleByProgress(
	animationType: AnimationType | undefined,
	progress: number,
): React.CSSProperties {
	if (!animationType || animationType === 'none' || progress < 0) return {};

	const clampedProgress = Math.min(progress, 1);

	switch (animationType) {
		case 'fade-in':
			return {
				opacity: clampedProgress,
			};
		case 'typing': {
			const widthPercent = clampedProgress * 100;
			return {
				maxWidth: `${widthPercent}%`,
				overflow: 'hidden',
				whiteSpace: 'nowrap',
				display: 'inline-block',
			};
		}
		case 'move':
			return {};
		default:
			return {};
	}
}

/**
 * Combines the active animation style with the current movement offset.
 * Arrays are treated as sequential animations.
 */
export function getAnimationStateAtTime(
	animations: AnimationConfig[] | undefined,
	elapsedSinceStart: number,
): {
	styles: React.CSSProperties;
	positionDelta?: { left: number; top: number };
} {
	const activeAnim = findActiveAnimation(animations, elapsedSinceStart);
	const positionDelta = getMoveDeltaAtTime(animations, elapsedSinceStart);

	if (!activeAnim) {
		return { styles: {}, positionDelta };
	}

	const { animation, progress } = activeAnim;
	const styles = getAnimationStyleByProgress(animation.type, progress);

	return { styles, positionDelta };
}
