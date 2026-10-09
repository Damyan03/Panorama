import { memo } from 'react';
import { Link } from 'react-router-dom';
import { videoTitleToSlug } from '../../api/videos';

interface AuthorInfo {
	displayName?: string;
	profilePicUrl?: string;
}

interface RecommendedVideoBlockProps {
	title: string;
	author: AuthorInfo | null;
	timestamp: string;
	views: number;
	duration: string;
	coverSrc?: string;
}

function RecommendedVideoBlock({
	title,
	author,
	timestamp,
	views,
	duration,
	coverSrc,
}: RecommendedVideoBlockProps) {
	const slug = videoTitleToSlug(title);

	return (
		<Link to={`/video/${slug}`} className="block h-full w-full">
			<div className="card flex overflow-hidden text-text-primary hover:shadow-lg">
				<div className="aspect-video bg-bg-elevated relative w-5/12">
					{coverSrc ? (
						<img
							src={coverSrc}
							alt={title}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full bg-linear-to-br from-accent-cyan to-accent-purple" />
					)}
					<span className="absolute bottom-2 right-2 bg-overlay-dark-70 px-2 py-1 rounded text-sm">
						{duration}
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-1 p-3">
					<h3 className="text-heading-sm line-clamp-2">{title}</h3>
					<div className="flex items-center gap-2">
						{author ? (
							<>
								{author.profilePicUrl ? (
									<img
										src={author.profilePicUrl}
										alt={author.displayName || 'author'}
										className="w-6 h-6 rounded-full object-cover"
									/>
								) : (
									<div className="w-6 h-6 rounded-full bg-ui-subtle" />
								)}
								<span className="text-body">
									{author.displayName}
								</span>
							</>
						) : null}
					</div>
					<div className="flex gap-2 text-body">
						<span>{timestamp}</span>
						<span>{views.toLocaleString()} views</span>
					</div>
				</div>
			</div>
		</Link>
	);
}

export default memo(RecommendedVideoBlock);
