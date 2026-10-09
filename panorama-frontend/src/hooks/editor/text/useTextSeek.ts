import { useCallback, useState } from 'react';

export type TextSeekRequest = {
	requestId: number;
	elapsedMs: number;
};

export function useTextSeek() {
	const [textSeekRequest, setTextSeekRequest] =
		useState<TextSeekRequest | null>(null);

	const handleTextItemSeek = useCallback((elapsedMs: number) => {
		const normalizedElapsedMs = Number.isFinite(elapsedMs)
			? Math.max(0, elapsedMs)
			: 0;

		setTextSeekRequest((previous) => ({
			requestId: (previous?.requestId ?? 0) + 1,
			elapsedMs: normalizedElapsedMs,
		}));
	}, []);

	return {
		textSeekRequest,
		handleTextItemSeek,
	};
}
