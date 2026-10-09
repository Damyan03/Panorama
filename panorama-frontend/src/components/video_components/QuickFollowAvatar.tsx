import { useState } from 'react';
import { followUser, notifyFollowingUpdated } from '../../api/users';
import { useAuth } from '../../auth/AuthContext';
import { getInitial } from '../../utils/userDisplay';

type QuickFollowAvatarProps = {
	username?: string;
	displayName?: string;
	profilePicUrl?: string;
	sizeClassName?: string;
	followButtonClassName?: string;
};

function QuickFollowAvatar({
	username,
	displayName,
	profilePicUrl,
	sizeClassName = 'h-6 w-6',
	followButtonClassName = 'h-4 w-4 text-sm',
}: QuickFollowAvatarProps) {
	const { user, isAuthenticated } = useAuth();
	const [isFollowing, setIsFollowing] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const normalizedUsername = username?.trim();
	const canQuickFollow =
		Boolean(normalizedUsername) &&
		isAuthenticated &&
		normalizedUsername !== user?.username &&
		!isFollowing;

	const name = displayName?.trim() || normalizedUsername || 'author';

	const handleQuickFollow = async (
		event: React.MouseEvent<HTMLButtonElement>,
	) => {
		event.preventDefault();
		event.stopPropagation();

		if (!normalizedUsername || isPending || !canQuickFollow) {
			return;
		}

		setIsPending(true);
		try {
			const state = await followUser(normalizedUsername);
			setIsFollowing(state.isFollowing);
			if (state.isFollowing) {
				notifyFollowingUpdated();
			}
		} catch {
			// Non-blocking quick action; keep the card interaction responsive.
		} finally {
			setIsPending(false);
		}
	};

	return (
		<div className={`relative shrink-0 ${sizeClassName}`}>
			{profilePicUrl ? (
				<img
					src={profilePicUrl}
					alt={name}
					className="h-full w-full rounded-full border border-border object-cover"
				/>
			) : (
				<div className="flex-center h-full w-full rounded-full border border-border bg-ui-subtle text-[10px] font-semibold uppercase text-text-primary">
					{getInitial(name)}
				</div>
			)}

			{canQuickFollow && (
				<button
					type="button"
					onClick={(event) => void handleQuickFollow(event)}
					disabled={isPending}
					className={`absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border border-bg-main bg-primary font-bold text-bg-main shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70 ${followButtonClassName}`}
					aria-label={`Quick follow ${name}`}
					title={`Follow ${name}`}
				>
					+
				</button>
			)}
		</div>
	);
}

export default QuickFollowAvatar;
