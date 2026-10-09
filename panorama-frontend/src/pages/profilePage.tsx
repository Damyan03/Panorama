import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAsyncResource } from '../hooks';
import { ApiError } from '../api/client';
import {
	followUser,
	getPublicUser,
	notifyFollowingUpdated,
	type PublicUser,
	unfollowUser,
} from '../api/users';
import { videoTitleToSlug } from '../api/videos';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { useAuth } from '../auth/AuthContext';
import { getInitial } from '../utils/userDisplay';
import { createAuthRouteState } from '../auth/routeState';
import { formatDurationMs, formatJoinDate } from '../utils/formatters/time';

type ApiErrorBody = { message?: string };

function readApiMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) {
		try {
			const parsed = JSON.parse(error.body) as ApiErrorBody;
			if (parsed?.message) return parsed.message;
		} catch {
			/* body wasn't JSON */
		}
	}
	return fallback;
}

function ProfilePage() {
	const { username = '' } = useParams<{ username: string }>();
	const location = useLocation();
	const { user } = useAuth();

	const { data, isLoading, error } = useAsyncResource(
		() => getPublicUser(username),
		[username],
	);
	const [profile, setProfile] = useState<PublicUser | null>(null);
	const [isFollowPending, setIsFollowPending] = useState(false);
	const [followError, setFollowError] = useState<string | null>(null);

	useEffect(() => {
		setProfile(data);
		setIsFollowPending(false);
		setFollowError(null);
	}, [data]);

	const authRouteState = createAuthRouteState(location);

	const handleToggleFollow = async () => {
		if (!profile || !user || user.id === profile.id || isFollowPending) {
			return;
		}

		setIsFollowPending(true);
		setFollowError(null);

		try {
			const nextState = profile.isFollowedByCurrentUser
				? await unfollowUser(profile.username)
				: await followUser(profile.username);

			setProfile((current) =>
				current
					? {
							...current,
							isFollowedByCurrentUser: nextState.isFollowing,
							followerCount: nextState.followerCount,
							followingCount: nextState.followingCount,
						}
					: current,
			);

			notifyFollowingUpdated();
		} catch (err: unknown) {
			setFollowError(
				readApiMessage(err, 'Unable to update follow status.'),
			);
		} finally {
			setIsFollowPending(false);
		}
	};

	if (isLoading) {
		return (
			<div className="container-main py-6">
				<p className="text-muted">Loading profile...</p>
			</div>
		);
	}

	if (error || !profile) {
		const notFound = error instanceof ApiError && error.status === 404;
		return (
			<div className="container-main py-6">
				<div className="card-panel">
					<h1 className="text-heading-md">
						{notFound ? 'User not found' : 'Profile unavailable'}
					</h1>
					<p className="mt-3 text-muted">
						{notFound
							? `No user matches @${username}.`
							: 'Something went wrong loading this profile.'}
					</p>
					<Link to="/" className="btn btn-secondary btn-sm mt-4">
						Back to home
					</Link>
				</div>
			</div>
		);
	}

	const isMe = user?.id === profile.id;
	const initial = getInitial(profile.displayName || profile.username);
	const joined = formatJoinDate(profile.joinedAt);
	const labels = (profile.labels ?? []).filter(
		(label) => label.trim().length > 0,
	);

	return (
		<div className="container-main py-6 max-w-5xl mx-auto">
			<div className="card-panel flex flex-col gap-5 md:flex-row md:items-center">
				<div className="h-24 w-24 shrink-0">
					<ProfileAvatar
						src={profile.profilePicUrl || undefined}
						alt={profile.displayName}
						initial={initial}
					/>
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-heading-md truncate">
							{profile.displayName}
						</h1>
						{labels.map((label) => (
							<span key={label} className="badge badge-secondary">
								{label}
							</span>
						))}
						{profile.role && profile.role !== 'User' && (
							<span className="badge badge-success">
								{profile.role}
							</span>
						)}
					</div>
					<div className="text-body mt-1">@{profile.username}</div>
					{profile.profileDescription && (
						<p className="text-body mt-2 whitespace-pre-wrap">
							{profile.profileDescription}
						</p>
					)}
					{joined && (
						<div className="text-muted mt-1">Joined {joined}</div>
					)}
					<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body">
						{profile.gender && (
							<span>Gender: {profile.gender}</span>
						)}
						{profile.age !== null && profile.age !== undefined && (
							<span>Age: {profile.age}</span>
						)}
						{profile.nationality && (
							<span>Nationality: {profile.nationality}</span>
						)}
					</div>
					<div className="mt-3 flex flex-wrap gap-4 text-body">
						<span>
							<strong className="text-text-primary">
								{profile.videoCount}
							</strong>{' '}
							videos
						</span>
						<span>
							<strong className="text-text-primary">
								{profile.totalLikes}
							</strong>{' '}
							likes
						</span>
						<span>
							<strong className="text-text-primary">
								{profile.totalViews}
							</strong>{' '}
							views
						</span>
						<span>
							<strong className="text-text-primary">
								{profile.followerCount}
							</strong>{' '}
							followers
						</span>
						<span>
							<strong className="text-text-primary">
								{profile.followingCount}
							</strong>{' '}
							following
						</span>
					</div>
				</div>
				<div className="flex flex-col items-start gap-2 self-start md:self-center">
					{isMe ? (
						<Link
							to="/settings"
							className="btn btn-secondary btn-sm"
						>
							Edit profile
						</Link>
					) : user ? (
						<button
							type="button"
							onClick={() => void handleToggleFollow()}
							disabled={isFollowPending}
							className={`btn btn-sm ${profile.isFollowedByCurrentUser ? 'btn-secondary' : 'btn-primary'}`}
						>
							{isFollowPending
								? 'Saving...'
								: profile.isFollowedByCurrentUser
									? 'Unfollow'
									: 'Follow'}
						</button>
					) : (
						<Link
							to="/login"
							state={authRouteState}
							className="btn btn-primary btn-sm"
						>
							Log in to follow
						</Link>
					)}
					{followError && (
						<p className="text-xs text-error">{followError}</p>
					)}
				</div>
			</div>

			<section className="mt-8">
				<h2 className="text-heading-sm mb-4">Recent videos</h2>
				{profile.recentVideos.length === 0 ? (
					<div className="card p-4 text-muted">
						No public videos yet.
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{profile.recentVideos.map((c) => (
							<Link
								key={c.id}
								to={`/video/${videoTitleToSlug(c.title)}`}
								className="card-interactive flex flex-col overflow-hidden rounded-lg"
							>
								{c.coverSrc ? (
									<img
										src={c.coverSrc}
										alt={`Cover image for ${c.title}`}
										className="aspect-video w-full object-cover bg-bg-secondary"
									/>
								) : (
									<div className="aspect-video w-full bg-bg-secondary" />
								)}
								<div className="p-3">
									<div className="truncate font-medium">
										{c.title}
									</div>
									<div className="mt-1 text-muted flex justify-between">
										<span>
											{formatDurationMs(c.totalDuration)}
										</span>
										<span>
											{c.views} views · {c.likes} likes
										</span>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

export default ProfilePage;
