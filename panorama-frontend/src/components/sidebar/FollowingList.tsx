import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
	FOLLOWING_UPDATED_EVENT,
	getMyFollowing,
	type FollowingUser,
} from '../../api/users';
import { getInitial } from '../../utils/userDisplay';
import ProfileAvatar from '../ui/ProfileAvatar';

type FollowingListProps = {
	onClose: () => void;
};

function FollowingList({ onClose }: FollowingListProps) {
	const [following, setFollowing] = useState<FollowingUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		const loadFollowing = async () => {
			setIsLoading(true);
			try {
				const items = await getMyFollowing();
				if (!active) return;
				setFollowing(items);
				setLoadError(null);
			} catch {
				if (!active) return;
				setFollowing([]);
				setLoadError('Unable to load following list.');
			} finally {
				if (active) setIsLoading(false);
			}
		};

		const handleFollowingUpdated = () => {
			void loadFollowing();
		};

		void loadFollowing();
		window.addEventListener(
			FOLLOWING_UPDATED_EVENT,
			handleFollowingUpdated,
		);

		return () => {
			active = false;
			window.removeEventListener(
				FOLLOWING_UPDATED_EVENT,
				handleFollowingUpdated,
			);
		};
	}, []);

	return (
		<div className="card overflow-hidden">
			<div className="border-b border-border px-4 py-2 text-label-md text-text-muted">
				Following
			</div>
			{isLoading ? (
				<div className="px-4 py-3 text-body text-text-muted">
					Loading...
				</div>
			) : loadError ? (
				<div className="px-4 py-3 text-body text-error">
					{loadError}
				</div>
			) : following.length === 0 ? (
				<div className="px-4 py-3 text-body text-text-muted">
					No subscriptions yet.
				</div>
			) : (
				<ul
					className="max-h-72 overflow-y-auto"
					aria-label="Following users"
				>
					{following.map((item) => {
						const displayName =
							item.displayName?.trim() || item.username;
						return (
							<li
								key={item.id}
								className="border-b border-border last:border-b-0"
							>
								<Link
									to={`/u/${item.username}`}
									onClick={onClose}
									className="flex items-center gap-3 px-4 py-2 transition hover:bg-bg-elevated"
									aria-label={`View ${displayName}'s profile`}
								>
									<ProfileAvatar
										src={item.profilePicUrl || undefined}
										alt={displayName}
										initial={getInitial(displayName)}
										size="sm"
									/>
									<div className="min-w-0 flex-1">
										<div className="truncate text-body text-text-primary">
											{displayName}
										</div>
										<div className="truncate text-xs text-text-muted">
											@{item.username}
										</div>
									</div>
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export default FollowingList;
