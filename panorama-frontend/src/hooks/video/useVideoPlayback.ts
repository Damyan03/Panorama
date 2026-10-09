import { useCallback, useEffect, useRef, useState } from 'react';

type VideoSeekRequest = {
	requestId: number;
	elapsedMs: number;
};

type UseVideoPlaybackParams = {
	totalDuration: number;
	externalSeekRequest?: VideoSeekRequest | null;
};

type UseVideoPlaybackReturn = {
	isRunning: boolean;
	elapsedMs: number;
	hasFinished: boolean;
	startPlayback: () => void;
	stopPlayback: () => void;
	seekPlayback: (nextElapsedMs: number) => void;
};

/**
 * Owns the rAF-driven timer loop, seek logic, and external seek request
 * handling for the video player. SRP: no UI, no audio concerns.
 */
export function useVideoPlayback({
	totalDuration,
	externalSeekRequest,
}: UseVideoPlaybackParams): UseVideoPlaybackReturn {
	const [isRunning, setIsRunning] = useState(false);
	const [elapsedMs, setElapsedMs] = useState(0);

	// Refs let the rAF tick read current values without creating a new closure
	// on every state change, which would cancel and restart the loop each frame.
	const animationFrameRef = useRef<number | null>(null);
	const startTimeRef = useRef(0);
	const elapsedMsRef = useRef(0);
	const isRunningRef = useRef(false);
	const lastExternalSeekRequestIdRef = useRef<number | null>(null);

	useEffect(() => {
		elapsedMsRef.current = elapsedMs;
	}, [elapsedMs]);

	useEffect(() => {
		isRunningRef.current = isRunning;
	}, [isRunning]);

	const seekPlayback = useCallback(
		(nextElapsedMs: number) => {
			const clamped = Math.max(0, Math.min(totalDuration, nextElapsedMs));
			setElapsedMs(clamped);
			if (isRunningRef.current) {
				startTimeRef.current = performance.now() - clamped;
			}
		},
		[totalDuration],
	);

	const startPlayback = useCallback(() => {
		if (isRunningRef.current) return;
		startTimeRef.current = performance.now() - elapsedMsRef.current;
		setIsRunning(true);
	}, []);

	const stopPlayback = useCallback(() => {
		setIsRunning(false);
	}, []);

	useEffect(() => {
		if (!isRunning) {
			if (animationFrameRef.current !== null) {
				window.cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			return;
		}

		const tick = () => {
			const nextElapsed = Math.floor(
				performance.now() - startTimeRef.current,
			);

			if (totalDuration > 0 && nextElapsed >= totalDuration) {
				setElapsedMs(totalDuration);
				setIsRunning(false);
				return;
			}

			if (nextElapsed !== elapsedMsRef.current) {
				setElapsedMs(nextElapsed);
			}

			animationFrameRef.current = window.requestAnimationFrame(tick);
		};

		tick();

		return () => {
			if (animationFrameRef.current !== null) {
				window.cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
		};
	}, [isRunning, totalDuration]);

	useEffect(() => {
		if (!externalSeekRequest) return;
		if (
			lastExternalSeekRequestIdRef.current ===
			externalSeekRequest.requestId
		) {
			return;
		}
		lastExternalSeekRequestIdRef.current = externalSeekRequest.requestId;
		seekPlayback(externalSeekRequest.elapsedMs);
	}, [externalSeekRequest, seekPlayback]);

	const hasFinished =
		totalDuration > 0 && elapsedMs >= totalDuration && !isRunning;

	return {
		isRunning,
		elapsedMs,
		hasFinished,
		startPlayback,
		stopPlayback,
		seekPlayback,
	};
}
