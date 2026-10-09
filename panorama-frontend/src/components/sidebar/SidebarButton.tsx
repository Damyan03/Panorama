import type { ReactNode } from 'react';

type Props = {
	onClick: () => void;
	children: ReactNode;
	variant?: 'default' | 'primary' | 'secondary';
	'aria-label'?: string;
	title?: string;
};

export default function SidebarButton({
	onClick,
	children,
	variant = 'default',
	'aria-label': ariaLabel,
	title,
}: Props) {
	const variantMap = {
		default: 'btn btn-secondary',
		primary: 'btn btn-primary',
		secondary: 'btn btn-ghost',
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={`${variantMap[variant]} h-15 w-full justify-center`}
			aria-label={ariaLabel}
			title={title}
		>
			{children}
		</button>
	);
}
