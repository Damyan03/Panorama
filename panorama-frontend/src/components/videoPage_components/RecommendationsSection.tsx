import { memo, useEffect, useRef, useState } from 'react';
import {
	getVideos,
	type VideoRecommendationItem,
} from '../../api/videos';
import { formatDurationMs, getRelativeTime } from '../../utils/formatters/time';
import {
	areRecommendationsEqual,
	areRecommendationsSectionPropsEqual,
	areTagListsEqual,
	type RecommendationsSectionProps,
} from '../../utils/video/recommendationsOptimise';
import RecommendedVideoBlock from './RecommendedVideoBlock';

function RecommendationsSection({
	videoId,
	tags,
}: RecommendationsSectionProps) {
	const [recommendations, setRecommendations] = useState<
		VideoRecommendationItem[]
	>([]);
	const [isLoading, setIsLoading] = useState(true);
	const stableTagsRef = useRef(tags);

	if (!areTagListsEqual(stableTagsRef.current, tags)) {
		stableTagsRef.current = tags;
	}

	const stableTags = stableTagsRef.current;

	useEffect(() => {
		let active = true;
		setIsLoading(true);

		void getVideos(1, 30, {
			preferredTags: stableTags,
			status: 'uploaded',
		})
			.then((result) => {
				if (!active) return;
				const filtered = result.items
					.filter((item) => item.id !== videoId)
					.slice(0, 3);
				setRecommendations((previous) =>
					areRecommendationsEqual(previous, filtered)
						? previous
						: filtered,
				);
			})
			.catch(() => {
				if (!active) return;
				setRecommendations((previous) =>
					previous.length === 0 ? previous : [],
				);
			})
			.finally(() => {
				if (!active) return;
				setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, [videoId, stableTags]);

	return (
		<div className="flex h-full w-full flex-col gap-2">
			<h2 className="text-heading-sm">Other Videos</h2>
			{isLoading ? (
				<div className="text-body text-text-secondary">
					Loading recommendations...
				</div>
			) : null}
			{!isLoading && recommendations.length === 0 ? (
				<div className="text-body text-text-secondary">
					No related videos found yet.
				</div>
			) : null}
			{recommendations.map((video) => (
				<RecommendedVideoBlock
					key={video.id}
					title={video.title}
					author={video.author}
					timestamp={getRelativeTime(video.dayUploaded)}
					views={video.views}
					duration={formatDurationMs(video.totalDuration)}
					coverSrc={video.coverSrc}
				/>
			))}
		</div>
	);
}

export default memo(
	RecommendationsSection,
	areRecommendationsSectionPropsEqual,
);
