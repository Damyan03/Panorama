import type { VideoRecommendationItem } from '../../api/videos';
import {
	areArraysEqual,
	areShallowEqualByKeys,
	areStrictlyEqual,
} from '../optimise/equality';

const RECOMMENDATION_ITEM_COMPARE_KEYS = [
	'id',
	'title',
	'dayUploaded',
	'coverSrc',
	'views',
	'totalDuration',
] as const satisfies readonly (keyof VideoRecommendationItem)[];

export type RecommendationsSectionProps = {
	videoId: number;
	tags: string[];
};

function areRecommendationItemsEqual(
	previous: VideoRecommendationItem,
	next: VideoRecommendationItem,
): boolean {
	if (
		!areShallowEqualByKeys(previous, next, RECOMMENDATION_ITEM_COMPARE_KEYS)
	) {
		return false;
	}

	return (
		previous.author?.displayName === next.author?.displayName &&
		previous.author?.profilePicUrl === next.author?.profilePicUrl
	);
}

export function areTagListsEqual(
	previous: readonly string[],
	next: readonly string[],
): boolean {
	return areArraysEqual(previous, next, areStrictlyEqual);
}

export function areRecommendationsEqual(
	previous: readonly VideoRecommendationItem[],
	next: readonly VideoRecommendationItem[],
): boolean {
	return areArraysEqual(previous, next, areRecommendationItemsEqual);
}

export function areRecommendationsSectionPropsEqual(
	previous: RecommendationsSectionProps,
	next: RecommendationsSectionProps,
): boolean {
	return (
		previous.videoId === next.videoId &&
		areTagListsEqual(previous.tags, next.tags)
	);
}
