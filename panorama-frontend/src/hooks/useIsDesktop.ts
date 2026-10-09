import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is desktop size (md breakpoint and above)
 * Uses the Tailwind md breakpoint (768px)
 */
export function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState(false);

	useEffect(() => {
		// Check initial state
		const mediaQuery = window.matchMedia('(min-width: 1080px)');
		setIsDesktop(mediaQuery.matches);

		// Listen for changes
		const handleChange = (e: MediaQueryListEvent) => {
			setIsDesktop(e.matches);
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, []);

	return isDesktop;
}
