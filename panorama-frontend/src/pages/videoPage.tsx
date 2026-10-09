import { memo, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
	VideoHeader,
	VideoPlayer,
	CommentsSection,
	Gallery,
	RecommendationsSection,
} from '../components/videoPage_components';
import { getVideoBySlug } from '../api/videos';
import type { VideoData } from '../types/video';

function VideoPage() {
	const { slug } = useParams();
	const [videoData, setVideoData] = useState<VideoData | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let active = true;
		setIsLoading(true);
		setVideoData(null);

		void getVideoBySlug(slug ?? '')
			.then((nextVideo) => {
				if (active) setVideoData(nextVideo);
			})
			.catch(() => {
				if (active) setVideoData(null);
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, [slug]);

	if (isLoading) {
		return (
			<div className="container mx-auto p-6 text-text-secondary">
				Loading video...
			</div>
		);
	}

	if (!videoData) {
		return (
			<div className="container mx-auto p-6 text-text-secondary">
				Video not found.
			</div>
		);
	}

	return (
		<div className="bg-bg-main">
			<div className="mx-auto grid w-full max-w-425 grid-cols-1 gap-3 p-2 md:gap-4 md:p-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch xl:gap-6">
				<div className="min-w-0 xl:col-start-1 xl:row-start-1">
					<VideoPlayer data={videoData} />
				</div>

				<div className="min-w-0 flex flex-col gap-2 xl:col-start-1 xl:row-start-2">
					<VideoHeader
						data={videoData}
						videoId={videoData.id}
						initialLikes={videoData.likes}
						initialIsLiked={videoData.likedByCurrentUser}
					/>
					<Gallery images={videoData.content.images} />
					<CommentsSection
						videoId={videoData.id}
						videoAuthorId={videoData.authorId}
					/>
				</div>

				<aside className="min-w-0 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:self-stretch">
					<div className="h-full xl:sticky xl:top-4">
						<RecommendationsSection
							videoId={videoData.id}
							tags={videoData.tags}
						/>
					</div>
				</aside>
			</div>
		</div>
	);
}

export default memo(VideoPage);
