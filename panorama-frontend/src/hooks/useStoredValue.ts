import { useEffect, useState } from 'react';

function readStoredString(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

function writeStoredString(key: string, value: string) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(key, value);
	} catch {
		// Ignore storage failures.
	}
}

export function useStoredBoolean(key: string, fallback: boolean) {
	const [value, setValue] = useState<boolean>(() => {
		const raw = readStoredString(key);
		if (raw === null) return fallback;
		return raw === 'true';
	});

	useEffect(() => {
		writeStoredString(key, String(value));
	}, [key, value]);

	return [value, setValue] as const;
}

export function useStoredVolume(
	key: string,
	fallback: number,
	min = 0,
	max = 100,
) {
	const [value, setValue] = useState<number>(() => {
		const raw = readStoredString(key);
		if (!raw) return fallback;
		const parsed = Number.parseInt(raw, 10);
		if (Number.isNaN(parsed)) return fallback;
		return Math.max(min, Math.min(max, parsed));
	});

	useEffect(() => {
		writeStoredString(key, String(value));
	}, [key, value]);

	return [value, setValue] as const;
}
