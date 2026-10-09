import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateShort } from '../../utils/formatters/time';
import type { VideoData } from '../../types/video';
import Icon from '../Icon';
import { ReportModal, ShareModal } from '../modals';
import { LikeButton } from '../video_components';
import QuickFollowAvatar from '../video_components/QuickFollowAvatar';

const VideoHeader = memo(function VideoHeader({
	data,
	videoId,
	initialLikes,
	initialIsLiked,
}: {
	data: VideoData;
	videoId: number;
	initialLikes?: number;
	initialIsLiked?: boolean;
}) {
	const [shareOpen, setShareOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const authorName = data.author?.displayName || 'Unknown';
	const authorProfileHref = data.author?.username?.trim()
		? `/u/${data.author.username}`
		: null;

	const authorContent = (
		<div className="flex-center flex-col">
			<span className="text-center">{authorName}</span>
			<QuickFollowAvatar
				username={data.author?.username}
				displayName={authorName}
				profilePicUrl={data.author?.profilePicUrl}
				sizeClassName="h-24 w-24"
				followButtonClassName="h-7 w-7 text-lg"
			/>
			<span className="text-muted">12398</span>
		</div>
	);

	return (
		<div className="flex gap-2 flex-col">
			<h1 className="text-heading-md">{data.title}</h1>
			<div className="flex flex-1 gap-4">
				<span>{data.views} Views</span>
				<span>{formatDateShort(data.dayUploaded)}</span>
			</div>
			<ReportModal
				open={reportOpen}
				resourceType="video"
				resourceId={videoId}
				onClose={() => setReportOpen(false)}
			/>
			<ShareModal
				open={shareOpen}
				onClose={() => setShareOpen(false)}
				videoTitle={data.title}
			/>
			<div className="flex items-center gap-2 text-label-md">
				<LikeButton
					videoId={videoId}
					initialLikes={initialLikes}
					initialIsLiked={initialIsLiked ?? false}
				/>
				<button
					type="button"
					onClick={() => setShareOpen(true)}
					aria-label="Share this video"
					className="btn-icon-action"
				>
					<Icon name="share" />
				</button>
				<button
					type="button"
					onClick={() => setReportOpen(true)}
					aria-label="Report this video"
					className="btn-icon-action"
				>
					<Icon name="report" />
				</button>
			</div>
			<div className="flex gap-4">
				{authorProfileHref ? (
					<Link
						to={authorProfileHref}
						className="hover:opacity-90 transition-opacity"
						aria-label={`View ${authorName}'s profile`}
					>
						{authorContent}
					</Link>
				) : (
					authorContent
				)}
				<div>
					<span className="text-label-md">Description</span>
					<p>{data.description}</p>
				</div>
			</div>
		</div>
	);
});

export default VideoHeader;
