import { useCallback, useEffect, useRef, useState } from 'react';

type UseVideoFullscreenReturn = {
	containerRef: React.RefObject<HTMLDivElement | null>;
	isFullscreen: boolean;
	isFullscreenSupported: boolean;
	toggleFullscreen: () => Promise<void>;
};

/**
 * Owns fullscreen enter/exit logic and the fullscreenchange listener.
 * The returned containerRef must be attached to the element that enters
 * fullscreen mode.
 */
export function useVideoFullscreen(): UseVideoFullscreenReturn {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const isFullscreenSupported =
		typeof document !== 'undefined' && document.fullscreenEnabled;

	const syncFullscreenState = useCallback(() => {
		setIsFullscreen(document.fullscreenElement === containerRef.current);
	}, []);

	const toggleFullscreen = useCallback(async () => {
		const el = containerRef.current;
		if (!el || !document.fullscreenEnabled) return;

		try {
			if (document.fullscreenElement === el) {
				await document.exitFullscreen();
				return;
			}
			await el.requestFullscreen();
		} catch {
			// Keep state accurate when the browser blocks fullscreen requests.
			syncFullscreenState();
		}
	}, [syncFullscreenState]);

	useEffect(() => {
		document.addEventListener('fullscreenchange', syncFullscreenState);
		return () => {
			document.removeEventListener(
				'fullscreenchange',
				syncFullscreenState,
			);
		};
	}, [syncFullscreenState]);

	return {
		containerRef,
		isFullscreen,
		isFullscreenSupported,
		toggleFullscreen,
	};
}
