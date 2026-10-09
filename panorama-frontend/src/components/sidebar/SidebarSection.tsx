import type { ReactNode } from 'react';

type Props = {
	children: ReactNode;
	gap?: 'sm' | 'md' | 'lg';
	flex?: boolean;
};

export default function SidebarSection({
	children,
	gap = 'md',
	flex = false,
}: Props) {
	const gapClasses = {
		sm: 'gap-2',
		md: 'gap-4',
		lg: 'gap-6',
	};

	return (
		<div
			className={`flex flex-col ${gapClasses[gap]} ${flex ? 'flex-1' : ''}`}
		>
			{children}
		</div>
	);
}
