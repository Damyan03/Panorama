import type { VideoData } from '../types/video';
import type { Author, PagedResult } from '../types/common';
import { buildQueryString } from '../utils/url';
import { safeJsonParse } from '../utils/safeJson';
import { requestJson } from './client';
import { deleteImage, uploadImage } from './images';

export type { PagedResult };

export interface VideoListItem {
	id: number;
	status: 'uploaded' | 'draft';
	title: string;
	author: Author | null;
	dayUploaded: string;
	coverSrc: string;
	views: number;
	likes: number;
	totalDuration: number;
}
export interface VideoRecommendationItem {
	id: number;
	title: string;
	author: Author | null;
	dayUploaded: string;
	coverSrc: string;
	views: number;
	totalDuration: number;
}

export interface VideoListFilters {
	status?: 'uploaded' | 'draft' | 'all';
	tag?: string | null;
	search?: string | null;
	sort?: 'trending' | 'most-viewed' | 'top-rated' | 'newest' | null;
	periodDays?: number | null;
	preferredTags?: string[];
	hiddenTags?: string[];
	timeRangeDays?: number | null;
	minDurationMinutes?: number | null;
	maxDurationMinutes?: number | null;
}

export function videoTitleToSlug(title: string) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

interface FullVideoRecord {
	id: number;
	title: string;
	description: string;
	authorId: number;
	author: Author | null;
	tags: string[];
	dayUploaded: string;
	coverSrc: string;
	views: number;
	likes: number;
	likedByCurrentUser?: boolean;
	totalDuration: number;
	// API returns the parsed object under `content`; legacy responses used `contentJson`.
	content?: VideoData['content'] | string;
	contentJson?: VideoData['content'] | string;
}

const BASE64_IMAGE_PATTERN = /^data:image\/[a-z+]+;base64,/;

export async function getVideos(
	page = 1,
	pageSize = 30,
	filters: VideoListFilters = {},
): Promise<PagedResult<VideoListItem>> {
	const qs = buildQueryString({
		page,
		pageSize,
		status: filters.status ?? 'uploaded',
		tag: filters.tag?.trim() || null,
		search: filters.search?.trim() || null,
		sort: filters.sort,
		period: filters.periodDays,
		preferredTags: filters.preferredTags,
		hiddenTags: filters.hiddenTags,
		timeRangeDays: filters.timeRangeDays,
		minDurationMinutes: filters.minDurationMinutes,
		maxDurationMinutes: filters.maxDurationMinutes,
	});
	return await requestJson<PagedResult<VideoListItem>>(
		`/videos${qs}`,
	);
}

export async function toggleLike(id: number) {
	return await requestJson<{ likes: number }>(`/videos/${id}/like`, {
		method: 'POST',
	});
}

export type DraftListItem = Pick<
	VideoListItem,
	| 'id'
	| 'status'
	| 'title'
	| 'dayUploaded'
	| 'coverSrc'
	| 'views'
	| 'totalDuration'
>;

export async function getMyDraftVideos(): Promise<{
	items: DraftListItem[];
	total: number;
}> {
	return await requestJson('/videos/my-drafts');
}

export async function createMyDraftVideo(): Promise<{
	id: number;
	status: 'draft';
	title: string;
}> {
	return await requestJson('/videos/drafts', { method: 'POST' });
}

export async function deleteMyDraftVideo(id: number): Promise<void> {
	return await requestJson(`/videos/drafts/${id}`, { method: 'DELETE' });
}

/**
 * Persist a draft, uploading any embedded base64 images first. If saving fails,
 * attempts to roll back uploaded images so we don't orphan blobs on the server.
 */
export async function saveMyDraftVideo(
	draft: VideoData,
): Promise<void> {
	const uploaded: Array<{ id: string; previewId: string }> = [];

	const rollback = () =>
		Promise.all(
			uploaded.flatMap(({ id, previewId }) => [
				deleteImage(id).catch(() => undefined),
				deleteImage(previewId).catch(() => undefined),
			]),
		);

	const uploadDataUrl = async (dataUrl: string) => {
		const blob = await (await fetch(dataUrl)).blob();
		const ext = (blob.type.split('/')[1] || 'png').replace('+', '');
		const file = new File([blob], `upload.${ext}`, {
			type: blob.type || 'image/png',
		});
		const result = await uploadImage(file);
		uploaded.push({ id: result.id, previewId: result.previewId });
		return result;
	};

	try {
		for (const image of draft.content.images) {
			const src = image.src?.trim();
			if (src && src !== 'color' && BASE64_IMAGE_PATTERN.test(src)) {
				const result = await uploadDataUrl(src);
				if (result.error)
					throw new Error(`Image upload failed: ${result.error}`);
				image.src = result.url;
				image.previewSrc = result.previewUrl;
			}
		}

		await requestJson(`/videos/drafts/${draft.id}`, {
			method: 'PUT',
			body: JSON.stringify({
				title: draft.title,
				description: draft.description,
				tags: draft.tags,
				coverSrc: draft.coverSrc,
				totalDuration: draft.totalDuration,
				content: draft.content,
			}),
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		await rollback();
		throw error;
	}
}

export async function getVideoById(id: number): Promise<VideoData> {
	const rec = await requestJson<FullVideoRecord>(`/videos/${id}`);
	const raw = rec.contentJson ?? rec.content ?? null;
	const content: VideoData['content'] =
		typeof raw === 'string'
			? safeJsonParse(raw, { text: [], images: [] })
			: raw && typeof raw === 'object'
				? raw
				: { text: [], images: [] };

	return {
		id: rec.id,
		title: rec.title,
		description: rec.description,
		authorId: rec.authorId,
		author: rec.author,
		tags: rec.tags,
		dayUploaded: rec.dayUploaded,
		coverSrc: rec.coverSrc,
		views: rec.views,
		likes: rec.likes,
		likedByCurrentUser: rec.likedByCurrentUser ?? false,
		totalDuration: rec.totalDuration,
		content,
	};
}

export async function getFeaturedVideo() {
	const page = await getVideos(1, 1, { status: 'uploaded' });
	const first = page.items[0];
	return first ? await getVideoById(first.id) : null;
}

export async function getVideoBySlug(slug: string) {
	// TODO(api): replace with a dedicated `/videos/by-slug/{slug}` endpoint;
	// scanning the first page is acceptable while the catalogue stays small.
	const page = await getVideos(1, 200, { status: 'uploaded' });
	const found = page.items.find(
		(c) => videoTitleToSlug(c.title) === slug,
	);
	return found ? await getVideoById(found.id) : null;
}
