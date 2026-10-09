import type { ReactNode } from 'react';

/**
 * Component for visually hidden content that is still read by screen readers.
 * Use for aria-live announcements, additional context, or keyboard shortcuts.
 */
export default function ScreenReaderOnly({
	children,
	className = '',
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={`absolute -left-full -top-full h-px w-px overflow-hidden whitespace-nowrap ${className}`}
		>
			{children}
		</span>
	);
}
