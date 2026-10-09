import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import type { NumericPosition } from '../../utils/animations/image';
import {
	getRecalculatedTotalDuration,
	readFileAsDataUrl,
	replaceImage,
} from '../../utils/editor/draft';
import { recalculateImagesAfterReorder } from '../../utils/timeline/core';
import { clampScalePercent } from '../../utils/math/clamp';
import type { VideoData, ImageItem } from '../../types/video';

interface UseEditorImageStateParams {
	videoDraft: VideoData | null;
	setVideoDraft: Dispatch<SetStateAction<VideoData | null>>;
	selectedImageId: number | null;
	setSelectedImageId: Dispatch<SetStateAction<number | null>>;
}

export function useEditorImageState({
	videoDraft,
	setVideoDraft,
	selectedImageId,
	setSelectedImageId,
}: UseEditorImageStateParams) {
	const [draftScale, setDraftScale] = useState(100);
	const pendingScaleRef = useRef<number | null>(null);

	const imageItems = videoDraft?.content?.images ?? [];
	const selectedImage =
		selectedImageId === null
			? null
			: (imageItems.find((item) => item.id === selectedImageId) ?? null);

	// Auto-select the first image when a draft loads (or after a discard) and
	// keep `draftScale` synced with whichever image is currently selected.
	useEffect(() => {
		if (!videoDraft) return;

		if (selectedImageId === null) {
			const firstImage = videoDraft.content?.images[0];
			if (firstImage) {
				setSelectedImageId(firstImage.id);
			}
			return;
		}

		if (!selectedImage) {
			// Selected image was removed externally (e.g. discard) — fall back.
			const firstImage = videoDraft.content?.images[0] ?? null;
			setSelectedImageId(firstImage?.id ?? null);
			return;
		}

		const nextScale = clampScalePercent(selectedImage.scale ?? 100);
		setDraftScale(nextScale);
		pendingScaleRef.current = nextScale;
	}, [videoDraft, selectedImage, selectedImageId, setSelectedImageId]);

	const applySelectedImageUpdate = useCallback(
		(updateImage: (image: ImageItem) => ImageItem) => {
			if (selectedImageId === null) {
				return;
			}

			setVideoDraft((previous) => {
				if (!previous) {
					return previous;
				}

				const images = previous.content?.images ?? [];

				return {
					...previous,
					content: {
						...previous.content,
						images: replaceImage(
							images,
							selectedImageId,
							updateImage,
						),
					},
				};
			});
		},
		[selectedImageId, setVideoDraft],
	);

	const applySelectedImageScale = useCallback(
		(scale: number) => {
			if (selectedImageId === null) {
				return;
			}

			const clampedScale = clampScalePercent(scale);

			applySelectedImageUpdate((image) => ({
				...image,
				scale: clampedScale,
			}));
		},
		[applySelectedImageUpdate, selectedImageId],
	);

	const handleTimelineImageSelect = useCallback(
		(item: ImageItem) => {
			setSelectedImageId(item.id);
		},
		[setSelectedImageId],
	);

	const handleReorderImages = useCallback(
		(nextImages: ImageItem[]) => {
			const recalculated = recalculateImagesAfterReorder(nextImages);

			setVideoDraft((previous) => {
				if (!previous) {
					return previous;
				}

				return {
					...previous,
					totalDuration: getRecalculatedTotalDuration(recalculated),
					content: {
						...previous.content,
						images: recalculated,
					},
				};
			});
		},
		[setVideoDraft],
	);

	const handleSelectedImagePositionChange = useCallback(
		(position: NumericPosition) => {
			if (selectedImageId === null) {
				return;
			}

			applySelectedImageUpdate((image) => ({
				...image,
				position,
			}));
		},
		[applySelectedImageUpdate, selectedImageId],
	);

	const handleSelectedImageDurationCommit = useCallback(
		(durationMs: number) => {
			if (selectedImageId === null) {
				return;
			}

			const clampedDurationMs = Math.max(0, Math.floor(durationMs));

			setVideoDraft((previous) => {
				if (!previous) {
					return previous;
				}

				const images = previous.content?.images ?? [];
				const selected = images.find(
					(item) => item.id === selectedImageId,
				);

				if (!selected) {
					return previous;
				}

				const previousDurationMs = selected.duration ?? 0;
				const deltaMs = clampedDurationMs - previousDurationMs;

				const shiftedImages = images.map((item) => {
					if (item.id === selectedImageId) {
						return { ...item, duration: clampedDurationMs };
					}

					if (item.startTime > selected.startTime && deltaMs !== 0) {
						return {
							...item,
							startTime: Math.max(0, item.startTime + deltaMs),
						};
					}

					return item;
				});

				return {
					...previous,
					totalDuration: getRecalculatedTotalDuration(shiftedImages),
					content: {
						...previous.content,
						images: shiftedImages,
					},
				};
			});
		},
		[selectedImageId, setVideoDraft],
	);

	const handleSelectedImageScaleChange = useCallback((scale: number) => {
		const clampedScale = clampScalePercent(scale);

		setDraftScale(clampedScale);
		pendingScaleRef.current = clampedScale;
	}, []);

	const handleSelectedImageScaleCommit = useCallback(() => {
		if (pendingScaleRef.current === null) {
			return;
		}

		applySelectedImageScale(pendingScaleRef.current);
	}, [applySelectedImageScale]);

	const appendImageFromFile = useCallback(
		async (file: File) => {
			const src = await readFileAsDataUrl(file);
			let appendedImageId: number | null = null;

			setVideoDraft((previous) => {
				if (!previous) return previous;

				const previousImages = previous.content?.images ?? [];
				const nextId =
					previousImages.length === 0
						? 1
						: Math.max(...previousImages.map((item) => item.id)) +
							1;

				const lastImage = previousImages[previousImages.length - 1];
				const nextStartTime = lastImage
					? lastImage.startTime + Math.max(0, lastImage.duration ?? 0)
					: 0;

				const nextImage: ImageItem = {
					id: nextId,
					src,
					startTime: nextStartTime,
					duration: 5000,
					position: { left: 50, top: 50 },
					scale: 100,
				};

				const nextImages = [...previousImages, nextImage];

				appendedImageId = nextId;

				return {
					...previous,
					totalDuration: getRecalculatedTotalDuration(nextImages),
					content: {
						...previous.content,
						images: nextImages,
					},
				};
			});

			// Keep side effects outside the updater to avoid StrictMode double-invocation.
			if (appendedImageId !== null) {
				setSelectedImageId(appendedImageId);
			}
		},
		[setVideoDraft, setSelectedImageId],
	);

	const appendSolidColorImage = useCallback(
		(color: string) => {
			let appendedImageId: number | null = null;

			setVideoDraft((previous) => {
				if (!previous) return previous;

				const previousImages = previous.content?.images ?? [];
				const nextId =
					previousImages.length === 0
						? 1
						: Math.max(...previousImages.map((item) => item.id)) +
							1;

				const lastImage = previousImages[previousImages.length - 1];
				const nextStartTime = lastImage
					? lastImage.startTime + Math.max(0, lastImage.duration ?? 0)
					: 0;

				const nextImage: ImageItem = {
					id: nextId,
					src: 'color',
					color,
					startTime: nextStartTime,
					duration: 5000,
					position: { left: 50, top: 50 },
					scale: 100,
				};

				const nextImages = [...previousImages, nextImage];

				appendedImageId = nextId;

				return {
					...previous,
					totalDuration: getRecalculatedTotalDuration(nextImages),
					content: {
						...previous.content,
						images: nextImages,
					},
				};
			});

			if (appendedImageId !== null) {
				setSelectedImageId(appendedImageId);
			}
		},
		[setVideoDraft, setSelectedImageId],
	);

	return {
		appendImageFromFile,
		appendSolidColorImage,
		draftScale,
		handleReorderImages,
		handleSelectedImageDurationCommit,
		handleSelectedImagePositionChange,
		handleSelectedImageScaleChange,
		handleSelectedImageScaleCommit,
		handleTimelineImageSelect,
		imageItems,
		selectedImage,
		selectedImageId,
	};
}
