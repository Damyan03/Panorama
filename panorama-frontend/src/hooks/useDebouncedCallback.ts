import { useRef, useCallback } from 'react';

export default function useDebouncedCallback<
	T extends (...args: never[]) => void,
>(fn: T, delay = 300) {
	const timer = useRef<number | null>(null);

	const cancel = useCallback(() => {
		if (timer.current !== null) {
			window.clearTimeout(timer.current);
			timer.current = null;
		}
	}, []);

	const call = useCallback(
		(...args: Parameters<T>) => {
			cancel();
			timer.current = window.setTimeout(() => {
				fn(...args);
				timer.current = null;
			}, delay);
		},
		[cancel, fn, delay],
	);

	return { call, cancel };
}
