import { useCallback } from 'react';

/**
 * Skip Links component for keyboard navigation.
 * Provides keyboard shortcuts to jump to main content areas.
 * Links are hidden but become visible on keyboard focus.
 */
export default function SkipLinks() {
	const handleSkipToMain = useCallback(() => {
		const main = document.getElementById('main-content');
		main?.focus();
		main?.scrollIntoView({ behavior: 'smooth' });
	}, []);

	const handleSkipToNav = useCallback(() => {
		const nav = document.getElementById('sidebar');
		nav?.focus();
	}, []);

	return (
		<>
			<a
				href="#main-content"
				onClick={(e) => {
					e.preventDefault();
					handleSkipToMain();
				}}
				className="fixed -top-full left-0 z-9999 bg-primary px-4 py-2 text-white font-semibold focus:top-0 focus:outline-none"
			>
				Skip to main content
			</a>
			<a
				href="#sidebar"
				onClick={(e) => {
					e.preventDefault();
					handleSkipToNav();
				}}
				className="fixed -top-full left-32 z-9999 bg-primary px-4 py-2 text-white font-semibold focus:top-0 focus:outline-none"
			>
				Skip to navigation
			</a>
		</>
	);
}
