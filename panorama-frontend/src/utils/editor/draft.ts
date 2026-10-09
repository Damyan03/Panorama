import type { VideoData, ImageItem } from '../../types/video';
import { EDITOR_TEXT_DEFAULT_WIDTH_PERCENT } from '../../constants/ui';
import { normalizeTextStyle } from './textStyle';

export function solidColorToDataUrl(color: string): string {
	const canvas = document.createElement('canvas');
	canvas.width = 4;
	canvas.height = 4;
	const ctx = canvas.getContext('2d');
	if (ctx) {
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 4, 4);
	}
	return canvas.toDataURL('image/png');
}

export function readFileAsDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(new Error('Failed to read file.'));
		reader.readAsDataURL(file);
	});
}

export function normalizeDraft(
	video: VideoData | null | undefined,
): VideoData | null {
	if (!video) {
		return null;
	}

	const textItems = Array.isArray(video.content?.text)
		? video.content.text
		: [];
	const imageItems = Array.isArray(video.content?.images)
		? video.content.images
		: [];

	return {
		id: Number.isFinite(video.id) ? video.id : 0,
		title: (video.title ?? '').trim() || 'Untitled draft',
		description: video.description ?? '',
		authorId: Number.isFinite(video.authorId) ? video.authorId : 0,
		author: video.author ?? null,
		tags: Array.isArray(video.tags) ? video.tags : [],
		dayUploaded: video.dayUploaded ?? new Date().toISOString(),
		coverSrc: video.coverSrc ?? '',
		views: Number.isFinite(video.views) ? video.views : 0,
		likes: Number.isFinite(video.likes) ? video.likes : 0,
		totalDuration: Number.isFinite(video.totalDuration)
			? video.totalDuration
			: 0,
		content: {
			text: textItems.map((item) => ({
				...item,
				scale: Number.isFinite(item.scale) ? item.scale : 100,
				width: Number.isFinite(item.width)
					? item.width
					: EDITOR_TEXT_DEFAULT_WIDTH_PERCENT,
				style: normalizeTextStyle(item.style),
			})),
			images: imageItems.map((item) => {
				const { endTime: _endTime, ...rest } = item;
				void _endTime;
				return {
					...rest,
					src: item.src ?? '',
					previewSrc: item.previewSrc ?? undefined,
					scale: Number.isFinite(item.scale) ? item.scale : 100,
					position: item.position ?? { left: 50, top: 50 },
					startTime: Number.isFinite(item.startTime)
						? item.startTime
						: 0,
					duration: Number.isFinite(item.duration)
						? item.duration
						: undefined,
				};
			}),
		},
	};
}

export function replaceImage(
	images: ImageItem[],
	imageId: number,
	updateImage: (image: ImageItem) => ImageItem,
) {
	return images.map((image) =>
		image.id === imageId ? updateImage(image) : image,
	);
}

export function getRecalculatedTotalDuration(imageItems: ImageItem[]) {
	let maxEnd = 0;
	for (const image of imageItems) {
		const end = image.startTime + Math.max(0, image.duration ?? 0);
		if (end > maxEnd) maxEnd = end;
	}
	return maxEnd;
}
