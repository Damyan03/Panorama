import Modal from '../ui/Modal';
import { useToast } from '../../hooks';
import Icon from '../Icon';

type ShareModalProps = {
	open: boolean;
	onClose: () => void;
	videoTitle: string;
};

function buildShareText(videoTitle: string): string {
	return `Check out "${videoTitle}" on Panorama`;
}

function getCurrentUrl(): string {
	if (typeof window === 'undefined') {
		return '';
	}
	return window.location.href;
}

export default function ShareModal({
	open,
	onClose,
	videoTitle,
}: ShareModalProps) {
	const { success: showSuccess, error: showError } = useToast();

	const url = getCurrentUrl();
	const shareText = buildShareText(videoTitle);
	const encodedUrl = encodeURIComponent(url);
	const encodedText = encodeURIComponent(shareText);
	const encodedTitle = encodeURIComponent(videoTitle);

	const xShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
	const redditShareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
	const discordUrl = 'https://discord.com/channels/@me';

	const copyLink = async (): Promise<boolean> => {
		if (!url) {
			showError('No link available to copy.');
			return false;
		}

		try {
			await navigator.clipboard.writeText(url);
			showSuccess('Link copied');
			return true;
		} catch {
			showError('Could not copy link.');
			return false;
		}
	};

	const openShareUrl = (targetUrl: string) => {
		window.open(targetUrl, '_blank', 'noopener,noreferrer');
	};

	const handleShareX = () => {
		openShareUrl(xShareUrl);
	};

	const handleShareReddit = () => {
		openShareUrl(redditShareUrl);
	};

	const handleShareDiscord = () => {
		openShareUrl(discordUrl);
		void copyLink().then((copied) => {
			if (copied) {
				showSuccess('Discord opened. Paste your copied link in chat.');
			}
		});
	};

	return (
		<Modal
			open={open}
			title="Share video"
			description="Copy this link or share it directly on your favorite platform."
			onClose={onClose}
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<label
						className="text-label-sm text-muted"
						htmlFor="share-link"
					>
						Video link
					</label>
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							id="share-link"
							className="input flex-1"
							readOnly
							value={url}
						/>
						<button
							type="button"
							onClick={() => {
								void copyLink();
							}}
							className="btn btn-primary sm:shrink-0"
						>
							Copy link
						</button>
					</div>
				</div>

				<div className="flex gap-2 justify-center">
					<button
						type="button"
						onClick={handleShareX}
						className="btn btn-ghost btn-filter justify-center w-15"
					>
						<Icon name="xTwitter" />
						<span className="sr-only">Share on X</span>
					</button>
					<button
						type="button"
						onClick={handleShareReddit}
						className="btn btn-ghost btn-filter justify-center w-15"
					>
						<Icon name="reddit" />
						<span className="sr-only">Share on Reddit</span>
					</button>
					<button
						type="button"
						onClick={handleShareDiscord}
						className="btn btn-ghost btn-filter justify-center w-15"
					>
						<Icon name="discord" />
						<span className="sr-only">Share on Discord</span>
					</button>
				</div>
			</div>
		</Modal>
	);
}
