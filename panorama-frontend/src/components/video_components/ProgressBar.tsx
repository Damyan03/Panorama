import { memo, useCallback, useEffect, useRef, useState } from 'react';

function ProgressBar({
	elapsedMs,
	totalDuration,
	onSeek,
	onDragStart,
}: {
	elapsedMs: number;
	totalDuration: number;
	onSeek: (nextElapsedMs: number) => void;
	onDragStart: () => void;
}) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const safeTotal = totalDuration > 0 ? totalDuration : 0;
	const clampedElapsed = Math.max(0, Math.min(safeTotal, elapsedMs));
	const percent = safeTotal > 0 ? (clampedElapsed / safeTotal) * 100 : 0;

	const seekFromClientX = useCallback(
		(clientX: number) => {
			if (safeTotal === 0) return;

			const track = trackRef.current;
			if (!track) return;

			const rect = track.getBoundingClientRect();
			const ratio = (clientX - rect.left) / rect.width;
			const nextElapsedMs = Math.max(
				0,
				Math.min(safeTotal, ratio * safeTotal),
			);

			onSeek(nextElapsedMs);
		},
		[onSeek, safeTotal],
	);

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		onDragStart();
		setIsDragging(true);
		seekFromClientX(event.clientX);
	}

	useEffect(() => {
		if (!isDragging) return;

		function handlePointerMove(event: PointerEvent) {
			seekFromClientX(event.clientX);
		}

		function handlePointerUp() {
			setIsDragging(false);
		}

		function handlePointerCancel() {
			setIsDragging(false);
		}

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', handlePointerCancel);

		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
			window.removeEventListener('pointerup', handlePointerUp);
			window.removeEventListener('pointercancel', handlePointerCancel);
		};
	}, [isDragging, seekFromClientX]);

	return (
		<div
			ref={trackRef}
			className={`relative h-3 w-full cursor-pointer overflow-visible rounded-full bg-ui-subtle ${isDragging ? 'select-none' : ''}`}
			style={{ touchAction: 'none' }}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={safeTotal}
			aria-valuenow={Math.round(clampedElapsed)}
			onPointerDown={handlePointerDown}
		>
			<div
				className="h-full origin-left rounded-full bg-primary-light will-change-transform"
				style={{ transform: `scaleX(${percent / 100})` }}
			/>
			<div
				className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-text-primary shadow"
				style={{ left: `calc(${percent}% - 6px)` }}
			/>
		</div>
	);
}

export default memo(ProgressBar);
