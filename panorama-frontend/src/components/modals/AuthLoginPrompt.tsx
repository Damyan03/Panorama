import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { createAuthRouteState } from '../../auth/routeState';
import Modal from '../ui/Modal';

type Props = {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	loginLabel?: string;
	signupLabel?: string;
};

export default function AuthLoginPrompt({
	open,
	onClose,
	title,
	description,
	loginLabel = 'Log in',
	signupLabel = 'Create account',
}: Props) {
	const { isAuthenticated } = useAuth();
	const location = useLocation();
	const authRouteState = createAuthRouteState(location);

	useEffect(() => {
		if (open && isAuthenticated) {
			onClose();
		}
	}, [open, isAuthenticated, onClose]);

	return (
		<Modal
			open={open}
			title={title}
			description={description}
			onClose={onClose}
		>
			<div className="mt-6 flex gap-3">
				<Link
					to="/login"
					state={authRouteState}
					onClick={onClose}
					className="btn btn-primary flex-1 justify-center"
				>
					{loginLabel}
				</Link>
				<Link
					to="/register"
					state={authRouteState}
					onClick={onClose}
					className="btn btn-secondary flex-1 justify-center"
				>
					{signupLabel}
				</Link>
			</div>
		</Modal>
	);
}
