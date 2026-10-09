import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
	to: string;
	onClick: () => void;
	children: ReactNode;
	icon?: ReactNode;
	'aria-label'?: string;
	title?: string;
};

export default function SidebarLink({
	to,
	onClick,
	children,
	icon,
	'aria-label': ariaLabel,
	title,
}: Props) {
	return (
		<Link
			to={to}
			onClick={onClick}
			className="card card-interactive flex-center h-15 px-4"
			aria-label={ariaLabel}
			title={title}
		>
			{icon && <span className="mr-3 text-text-secondary">{icon}</span>}
			{children}
		</Link>
	);
}
