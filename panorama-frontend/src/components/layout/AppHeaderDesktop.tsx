import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { createAuthRouteState } from '../../auth/routeState';
import SearchInput from './SearchInput';
import ProfileAvatar from '../ui/ProfileAvatar';
import { getInitial } from '../../utils/userDisplay';

function AppHeaderDesktop() {
	const location = useLocation();
	const { user, isAuthenticated } = useAuth();
	const authRouteState = createAuthRouteState(location);
	const profileLabel = user?.displayName?.trim() || 'Profile';

	return (
		<div className="flex h-full w-full items-center justify-between">
			<Link
				to="/"
				className="flex items-center gap-2 text-heading-sm"
				aria-label="Panorama Home"
			>
				<span>
					<span className="text-primary">Pano</span>
					<span>rama</span>
				</span>
			</Link>
			<div className="min-w-0 flex-1 w-1/2 flex justify-center">
				<SearchInput alwaysVisible className="w-full max-w-2xl" />
			</div>
			{isAuthenticated && user ? (
				<Link
					to={`/u/${user.username}`}
					aria-label={`View ${profileLabel}'s profile`}
					className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
				>
					<ProfileAvatar
						src={user.profilePicUrl?.trim() || undefined}
						alt={profileLabel}
						initial={getInitial(user.displayName)}
						size="sm"
						className="shadow-sm"
					/>
				</Link>
			) : (
				<div className="flex shrink-0 items-center gap-2">
					<Link
						to="/login"
						state={authRouteState}
						className="btn btn-secondary btn-sm"
					>
						Log in
					</Link>
					<Link
						to="/register"
						state={authRouteState}
						className="btn btn-primary btn-sm"
					>
						Sign up
					</Link>
				</div>
			)}
		</div>
	);
}

export default AppHeaderDesktop;
