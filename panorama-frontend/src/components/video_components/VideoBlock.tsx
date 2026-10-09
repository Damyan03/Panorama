import { memo } from 'react';
import { Link } from 'react-router-dom';

interface AuthorInfo {
	displayName?: string;
	profilePicUrl?: string;
}

interface VideoBlockProps {
	title: string;
	author: AuthorInfo | null;
	timestamp: string;
	coverSrc: string;
	views: number;
	duration: string;
}

function VideoBlock({
	title,
	author,
	timestamp,
	coverSrc,
	views,
	duration,
}: VideoBlockProps) {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

	return (
		<Link to={`/video/${slug}`} className="block h-full w-full">
			<div className="card h-full w-full overflow-hidden text-text-primary hover:shadow-lg">
				<div className="aspect-video bg-bg-elevated relative overflow-hidden">
					{coverSrc ? (
						<img
							src={coverSrc}
							alt={title}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full bg-bg-elevated" />
					)}
					<span className="absolute bottom-2 right-2 bg-overlay-dark-70 px-2 py-1 rounded text-sm">
						{duration}
					</span>
				</div>
				<div className="flex flex-col gap-2 p-3">
					<div className="flex justify-between text-sm text-label-md">
						<div className="flex gap-1 items-center">
							{author ? (
								<div className="flex items-center gap-2">
									{author.profilePicUrl ? (
										<img
											src={author.profilePicUrl}
											alt={author.displayName || 'author'}
											className="w-6 h-6 rounded-full object-cover"
										/>
									) : (
										<div className="w-6 h-6 rounded-full bg-ui-subtle" />
									)}
									<span className="text-label-md">
										{author.displayName}
									</span>
								</div>
							) : null}
							<span className="text-muted">{timestamp}</span>
						</div>
						<span>{views.toLocaleString()} views</span>
					</div>
					<h3 className="text-heading-sm line-clamp-2">{title}</h3>
				</div>
			</div>
		</Link>
	);
}

export default memo(VideoBlock);
