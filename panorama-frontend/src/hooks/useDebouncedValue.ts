import { useEffect, useRef, useState } from 'react';

export default function useDebouncedValue<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
		}
		timerRef.current = window.setTimeout(() => {
			setDebouncedValue(value);
			timerRef.current = null;
		}, delay);

		return () => {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
			}
		};
	}, [value, delay]);

	return debouncedValue;
}
