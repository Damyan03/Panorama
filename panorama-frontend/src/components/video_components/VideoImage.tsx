import { memo, useRef } from 'react';
import useElementSize from '../../hooks/useElementSize';
import { getImageAnimationStateAtTime } from '../../utils/animations/image';
import { getMoveDeltaAtTime } from '../../utils/animations/sequencer';
import { clampScalePercent } from '../../utils/math/clamp';
import { calculateImageTransform } from '../../utils/images/positioning';
import type { AnimationConfig } from '../../utils/animations/text';
import type { NumericPosition } from '../../utils/animations/image';

interface VideoImageProps {
	src: string;
	color?: string;
	position: NumericPosition;
	scale: number;
	animation?: AnimationConfig[];
	elapsedMs: number;
	startTime: number;
}

function VideoImage({
	src,
	color,
	position,
	scale,
	animation,
	elapsedMs,
	startTime,
}: VideoImageProps) {
	const animState = getImageAnimationStateAtTime(
		animation,
		elapsedMs - startTime,
		position,
	);
	const moveDelta = getMoveDeltaAtTime(animation, elapsedMs - startTime);
	const finalLeft = (position?.left ?? 50) + (moveDelta.left ?? 0);
	const finalTop = (position?.top ?? 50) + (moveDelta.top ?? 0);
	const clampedScale = clampScalePercent(scale);

	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const wrapperSize = useElementSize(wrapperRef);
	const imgSize = useElementSize(imgRef);

	// Compute transform using shared logic for consistency with preview
	const transform = calculateImageTransform(
		{ left: finalLeft, top: finalTop },
		{ width: wrapperSize?.width ?? 0, height: wrapperSize?.height ?? 0 },
		{ width: imgSize?.width ?? 0, height: imgSize?.height ?? 0 },
	);

	return (
		<div ref={wrapperRef} className="absolute inset-0 overflow-hidden">
			{src === 'color' ? (
				<div
					className="absolute inset-0"
					style={{
						backgroundColor: color,
						opacity: animState.opacity,
					}}
				/>
			) : src ? (
				<img
					ref={imgRef}
					className="absolute left-0 top-0 h-auto max-w-none will-change-transform"
					style={{
						width: `${clampedScale}%`,
						transform: `translate(${transform.translateX}px, ${transform.translateY}px)`,
						opacity: animState.opacity,
					}}
					src={src}
					alt="Video frame"
				/>
			) : null}
		</div>
	);
}

export default memo(VideoImage);
