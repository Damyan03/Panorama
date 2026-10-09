import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '../../../utils/math/clamp';

type DualRangeSliderProps = {
	min: number;
	max: number;
	step?: number;
	lowerValue: number;
	upperValue: number;
	onLowerChange: (value: number) => void;
	onUpperChange: (value: number) => void;
	lowerLabel?: string;
	upperLabel?: string;
	className?: string;
};

type Thumb = 'lower' | 'upper';

export default function DualRangeSlider({
	min,
	max,
	step = 1,
	lowerValue,
	upperValue,
	onLowerChange,
	onUpperChange,
	lowerLabel,
	upperLabel,
	className = '',
}: DualRangeSliderProps) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [draggingThumb, setDraggingThumb] = useState<Thumb | null>(null);

	const safeLower = Math.min(lowerValue, upperValue);
	const safeUpper = Math.max(upperValue, lowerValue);
	const total = Math.max(1, max - min);
	const lowerPercent = ((safeLower - min) / total) * 100;
	const upperPercent = ((safeUpper - min) / total) * 100;

	const normalizeToStep = useCallback(
		(rawValue: number) => {
			const stepped = Math.round((rawValue - min) / step) * step + min;
			return clamp(stepped, min, max);
		},
		[max, min, step],
	);

	const valueFromClientX = useCallback(
		(clientX: number) => {
			const rect = trackRef.current?.getBoundingClientRect();
			if (!rect || rect.width <= 0) return safeLower;
			const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
			return normalizeToStep(min + ratio * (max - min));
		},
		[max, min, normalizeToStep, safeLower],
	);

	const updateThumbValue = useCallback(
		(thumb: Thumb, nextValue: number) => {
			if (thumb === 'lower') {
				onLowerChange(clamp(nextValue, min, safeUpper));
				return;
			}
			onUpperChange(clamp(nextValue, safeLower, max));
		},
		[max, min, onLowerChange, onUpperChange, safeLower, safeUpper],
	);

	const handleTrackPointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const nextValue = valueFromClientX(event.clientX);
			const lowerDistance = Math.abs(nextValue - safeLower);
			const upperDistance = Math.abs(nextValue - safeUpper);
			const thumb: Thumb =
				lowerDistance <= upperDistance ? 'lower' : 'upper';
			setDraggingThumb(thumb);
			updateThumbValue(thumb, nextValue);
		},
		[safeLower, safeUpper, updateThumbValue, valueFromClientX],
	);

	const handleThumbPointerDown = useCallback(
		(thumb: Thumb) => (event: React.PointerEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			setDraggingThumb(thumb);
		},
		[],
	);

	useEffect(() => {
		if (!draggingThumb) return;

		const onPointerMove = (event: PointerEvent) => {
			const nextValue = valueFromClientX(event.clientX);
			updateThumbValue(draggingThumb, nextValue);
		};

		const onPointerUp = () => {
			setDraggingThumb(null);
		};

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	}, [draggingThumb, updateThumbValue, valueFromClientX]);

	return (
		<div
			className={`rounded border border-overlay-light-20 p-3 ${className}`}
		>
			<div
				ref={trackRef}
				onPointerDown={handleTrackPointerDown}
				className="relative h-9 touch-none select-none"
			>
				<div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded bg-overlay-light-20" />
				<div
					className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary"
					style={{
						left: `${lowerPercent}%`,
						right: `${100 - upperPercent}%`,
					}}
				/>
				<button
					type="button"
					onPointerDown={handleThumbPointerDown('lower')}
					className="absolute top-1/2 z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-bg-main shadow"
					style={{ left: `${lowerPercent}%` }}
					aria-label="Minimum range value"
				/>
				<span
					className="absolute top-full z-20 mt-1 -translate-x-1/2 text-xs text-text-primary"
					style={{ left: `${lowerPercent}%` }}
				>
					{safeLower}
				</span>
				<button
					type="button"
					onPointerDown={handleThumbPointerDown('upper')}
					className="absolute top-1/2 z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-bg-main shadow"
					style={{ left: `${upperPercent}%` }}
					aria-label="Maximum range value"
				/>
				<span
					className="absolute top-full z-20 mt-1 -translate-x-1/2 text-xs text-text-primary"
					style={{ left: `${upperPercent}%` }}
				>
					{safeUpper}
				</span>
			</div>
			<div className="mt-6 flex justify-between text-xs text-muted">
				<span>{lowerLabel ?? String(min)}</span>
				<span>{upperLabel ?? String(max)}</span>
			</div>
		</div>
	);
}
