import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook to manage timer scheduling and cleanup.
 * Prevents memory leaks by automatically cleaning up on unmount.
 */
export function useTimer(callback: () => void, delayMs: number) {
	const timerRef = useRef<number | null>(null);

	const clear = useCallback(() => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const schedule = useCallback(() => {
		clear();
		timerRef.current = window.setTimeout(callback, delayMs);
	}, [clear, callback, delayMs]);

	useEffect(() => {
		return () => {
			clear();
		};
	}, [clear]);

	return { schedule, clear };
}
