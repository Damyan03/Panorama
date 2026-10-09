import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { createAuthRouteState } from '../../auth/routeState';
import ProfileAvatar from '../ui/ProfileAvatar';
import { getInitial } from '../../utils/userDisplay';

type Props = {
	isAuthenticated: boolean;
	displayName?: string;
	labels?: string[];
	role?: string;
	onClose: () => void;
};

export default function UserCard({
	isAuthenticated,
	displayName,
	labels,
	role,
	onClose,
}: Props) {
	const location = useLocation();
	const { user } = useAuth();
	const authRouteState = createAuthRouteState(location);
	const normalizedLabels = (labels ?? [])
		.map((label) => label.trim())
		.filter((label) => label.length > 0)
		.slice(0, 2);
	const normalizedRole = role?.trim() ?? '';
	const hasBadges =
		isAuthenticated &&
		(Boolean(normalizedRole) || normalizedLabels.length > 0);
	const roleBadgeClass =
		normalizedRole === 'Admin'
			? 'badge badge-role-admin'
			: 'badge badge-role-default';

	const avatar = (
		<ProfileAvatar
			src={user?.profilePicUrl?.trim() || undefined}
			alt={displayName || 'User profile'}
			initial={getInitial(displayName || 'Guest')}
			size="md"
		/>
	);

	return (
		<div className="flex w-full gap-2">
			<div className="card-elevated w-full h-24 p-3">
				<div className="h-full flex items-center gap-4">
					{isAuthenticated && user?.username ? (
						<Link
							to={`/u/${user.username}`}
							onClick={onClose}
							aria-label={`View ${displayName ?? user.username}'s profile`}
							className="h-full aspect-square rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
						>
							{avatar}
						</Link>
					) : (
						avatar
					)}
					<div className="flex flex-col min-w-0 gap-1 flex-1">
						<div className="flex flex-wrap flex-col">
							<div className="flex gap-2 items-center">
								<span className="font-bold">
									{isAuthenticated ? displayName : 'Guest'}
								</span>
							</div>
							{hasBadges ? (
								<div className="mt-1 flex flex-wrap items-center gap-1">
									{normalizedRole ? (
										<span className={roleBadgeClass}>
											{normalizedRole}
										</span>
									) : null}
									{normalizedLabels.map((label) => (
										<span
											key={label}
											className="badge badge-secondary"
										>
											{label}
										</span>
									))}
								</div>
							) : null}
						</div>
						{isAuthenticated ? null : (
							<div className="flex gap-3 w-full text-center">
								<div className="flex-1 btn btn-primary btn-sm justify-center">
									<Link
										to="/register"
										state={authRouteState}
										onClick={onClose}
										className="text-inherit font-medium"
									>
										Register
									</Link>
								</div>
								<div className="flex-1 btn btn-secondary btn-sm justify-center">
									<Link
										to="/login"
										state={authRouteState}
										onClick={onClose}
										className="text-inherit font-medium"
									>
										Login
									</Link>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
