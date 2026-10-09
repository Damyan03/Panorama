import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../Icon';
import { toggleLike } from '../../api/videos';
import { LikeLoginPrompt } from '../modals';

export default function LikeButton({
	videoId,
	initialLikes = 0,
	initialIsLiked = false,
}: {
	videoId: number;
	initialLikes?: number;
	initialIsLiked?: boolean;
}) {
	const [likes, setLikes] = useState<number>(initialLikes);
	const [isLiked, setIsLiked] = useState<boolean>(initialIsLiked);
	const [loading, setLoading] = useState(false);
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);
	const { isAuthenticated, isReady } = useAuth();

	const handleClick = async () => {
		if (!isReady) return;

		if (!isAuthenticated) {
			setShowLoginPrompt(true);
			return;
		}

		if (loading) return;
		const prevLiked = isLiked;
		const prevLikes = likes;

		setIsLiked(!prevLiked);
		setLikes(prevLiked ? Math.max(0, prevLikes - 1) : prevLikes + 1);
		setLoading(true);

		try {
			const result = await toggleLike(videoId);
			setLikes(result.likes);
		} catch {
			setIsLiked(prevLiked);
			setLikes(prevLikes);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				disabled={loading || !isReady}
				aria-pressed={isLiked}
				className={`flex-center aspect-square h-14 w-14 rounded-2xl border p-3 shadow-sm backdrop-blur-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main disabled:cursor-not-allowed disabled:opacity-50 ${
					isLiked
						? 'border-primary/40 bg-primary/15 text-primary'
						: 'border-border/70 bg-bg-elevated/80 text-text-secondary hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-lg'
				}`}
			>
				<Icon name="favourite" />
				<span className="sr-only">{likes} likes</span>
			</button>

			<LikeLoginPrompt
				open={showLoginPrompt}
				onClose={() => setShowLoginPrompt(false)}
			/>
		</>
	);
}
