import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	clampPercent,
	clampScalePercent,
	clampSignedPercent,
	clampWidthPercent,
	toClampedPercent,
} from '../../utils/math/clamp';
import { EDITOR_TEXT_DEFAULT_WIDTH_PERCENT } from '../../constants/ui';
import type { VideoData, TextItem, TextStyle } from '../../types/video';
import {
	type DraftSetter,
	setVideoText,
	updateVideoTextItem,
} from '../../utils/editor/draftMutations';
import {
	areTextStylesEqual,
	mergeTextStylePatch,
} from '../../utils/editor/textStyle';

const MIN_TEXT_LEFT_PERCENT = -100;
const MAX_TEXT_LEFT_PERCENT = 100;

export type TextItemTimelinePatch = Partial<
	Pick<TextItem, 'value' | 'startTime' | 'duration'>
>;

type TextPreviewPatch = {
	style?: Partial<TextStyle>;
	scale?: number;
	position?: { left: number; top: number };
	width?: number;
};

type PreviewMap = ReadonlyMap<number, TextPreviewPatch>;

type UseEditorTextStateParams = {
	videoDraft: VideoData | null;
	setVideoDraft: DraftSetter;
};

function normalizeWidth(width: number) {
	return Number(clampWidthPercent(width).toFixed(2));
}

function normalizePosition(position: { left: number; top: number }) {
	return {
		left: clampSignedPercent(position.left),
		top: clampPercent(position.top),
	};
}

function readItemPosition(item: TextItem) {
	return {
		left: toClampedPercent(
			item.position.left,
			50,
			MIN_TEXT_LEFT_PERCENT,
			MAX_TEXT_LEFT_PERCENT,
		),
		top: toClampedPercent(item.position.top, 50, 0, 100),
	};
}

function readItemWidth(item: TextItem) {
	return normalizeWidth(item.width ?? EDITOR_TEXT_DEFAULT_WIDTH_PERCENT);
}

function applyPreviewPatchToItem(
	item: TextItem,
	patch: TextPreviewPatch,
): TextItem {
	let nextItem = item;

	if (patch.position) {
		const previous = readItemPosition(item);
		if (
			previous.left !== patch.position.left ||
			previous.top !== patch.position.top
		) {
			nextItem = { ...nextItem, position: patch.position };
		}
	}

	if (patch.style) {
		const nextStyle = mergeTextStylePatch(item.style, patch.style);
		if (!areTextStylesEqual(item.style, nextStyle)) {
			nextItem = { ...nextItem, style: nextStyle };
		}
	}

	if (typeof patch.scale === 'number') {
		const nextScale = Math.round(clampScalePercent(patch.scale));
		if ((item.scale ?? 100) !== nextScale) {
			nextItem = { ...nextItem, scale: nextScale };
		}
	}

	if (typeof patch.width === 'number') {
		const nextWidth = patch.width;
		if (readItemWidth(item) !== nextWidth) {
			nextItem = { ...nextItem, width: nextWidth };
		}
	}

	return nextItem;
}

function applyPreviewPatches(
	videoDraft: VideoData | null,
	previewByItemId: PreviewMap,
): VideoData | null {
	if (!videoDraft || previewByItemId.size === 0) {
		return videoDraft;
	}

	const previousItems = videoDraft.content?.text ?? [];
	let hasAnyChanges = false;

	const nextItems = previousItems.map((item) => {
		const patch = previewByItemId.get(item.id);
		if (!patch) return item;

		const nextItem = applyPreviewPatchToItem(item, patch);
		if (nextItem !== item) hasAnyChanges = true;
		return nextItem;
	});

	if (!hasAnyChanges) return videoDraft;

	return {
		...videoDraft,
		content: { ...videoDraft.content, text: nextItems },
	};
}

function getTextItemDurationMs(item: TextItem) {
	if (typeof item.duration === 'number' && Number.isFinite(item.duration)) {
		return Math.max(0, item.duration);
	}
	if (typeof item.endTime === 'number' && Number.isFinite(item.endTime)) {
		return Math.max(0, item.endTime - item.startTime);
	}
	return 0;
}

export function useEditorTextState({
	videoDraft,
	setVideoDraft,
}: UseEditorTextStateParams) {
	const [previewByItemId, setPreviewByItemId] = useState<
		Map<number, TextPreviewPatch>
	>(() => new Map());

	const textItemsRef = useRef<TextItem[]>([]);
	textItemsRef.current = videoDraft?.content?.text ?? [];

	const updatePreviewPatch = useCallback(
		(
			itemId: number,
			mutate: (current: TextPreviewPatch) => TextPreviewPatch | null,
		) => {
			setPreviewByItemId((previous) => {
				const current = previous.get(itemId) ?? {};
				const next = mutate(current);
				if (next === null) return previous;

				const next_isEmpty = Object.keys(next).length === 0;
				const out = new Map(previous);
				if (next_isEmpty) {
					if (!out.delete(itemId)) return previous;
				} else {
					out.set(itemId, next);
				}
				return out;
			});
		},
		[],
	);

	const clearPreviewKeys = useCallback(
		(itemId: number, keys: readonly (keyof TextPreviewPatch)[]) => {
			updatePreviewPatch(itemId, (current) => {
				let next: TextPreviewPatch | null = null;
				for (const key of keys) {
					if (key in current) {
						if (next === null) next = { ...current };
						delete next[key];
					}
				}
				return next;
			});
		},
		[updatePreviewPatch],
	);

	const resetTextPreviewState = useCallback(() => {
		setPreviewByItemId((previous) =>
			previous.size === 0 ? previous : new Map(),
		);
	}, []);

	useEffect(() => {
		resetTextPreviewState();
	}, [videoDraft?.id, resetTextPreviewState]);

	const videoPreviewDraft = useMemo(() => {
		return applyPreviewPatches(videoDraft, previewByItemId);
	}, [videoDraft, previewByItemId]);

	const handlePreviewTextItemStyle = useCallback(
		(textItemId: number, stylePatch: Partial<TextStyle>) => {
			const entries = Object.entries(stylePatch);
			if (entries.length === 0) return;

			updatePreviewPatch(textItemId, (current) => {
				const previousStyle = (current.style ?? {}) as Record<
					string,
					unknown
				>;
				let nextStyle: Record<string, unknown> | null = null;

				for (const [key, value] of entries) {
					if (previousStyle[key] === value) continue;
					if (nextStyle === null) nextStyle = { ...previousStyle };
					nextStyle[key] = value;
				}

				if (nextStyle === null) return null;
				return { ...current, style: nextStyle as Partial<TextStyle> };
			});
		},
		[updatePreviewPatch],
	);

	const handlePreviewTextItemScale = useCallback(
		(textItemId: number, scale: number) => {
			const nextScale = Math.round(clampScalePercent(scale));
			updatePreviewPatch(textItemId, (current) =>
				current.scale === nextScale
					? null
					: { ...current, scale: nextScale },
			);
		},
		[updatePreviewPatch],
	);

	const handlePreviewTextItemPosition = useCallback(
		(textItemId: number, position: { left: number; top: number }) => {
			const nextPosition = normalizePosition(position);
			updatePreviewPatch(textItemId, (current) => {
				const previous = current.position;
				if (
					previous?.left === nextPosition.left &&
					previous?.top === nextPosition.top
				) {
					return null;
				}
				return { ...current, position: nextPosition };
			});
		},
		[updatePreviewPatch],
	);

	const handlePreviewTextItemWidth = useCallback(
		(textItemId: number, width: number) => {
			const nextWidth = normalizeWidth(width);
			updatePreviewPatch(textItemId, (current) =>
				current.width === nextWidth
					? null
					: { ...current, width: nextWidth },
			);
		},
		[updatePreviewPatch],
	);

	const handleReorderTextItems = useCallback(
		(nextTextItems: TextItem[]) => {
			setVideoText(
				setVideoDraft,
				(previousText) => {
					const sameByReference =
						previousText.length === nextTextItems.length &&
						previousText.every(
							(item, index) => item === nextTextItems[index],
						);
					return sameByReference ? null : nextTextItems;
				},
				{ recomputeDuration: true },
			);
		},
		[setVideoDraft],
	);

	const handleUpdateTextItemScale = useCallback(
		(textItemId: number, scale: number) => {
			const clampedScale = clampScalePercent(scale);
			updateVideoTextItem(setVideoDraft, textItemId, (item) =>
				item.scale === clampedScale
					? null
					: { ...item, scale: clampedScale },
			);
			clearPreviewKeys(textItemId, ['scale']);
		},
		[clearPreviewKeys, setVideoDraft],
	);

	const handleUpdateTextItemStyle = useCallback(
		(textItemId: number, stylePatch: Partial<TextStyle>) => {
			if (Object.keys(stylePatch).length === 0) return;

			updateVideoTextItem(setVideoDraft, textItemId, (item) => {
				const nextStyle = mergeTextStylePatch(item.style, stylePatch);
				return areTextStylesEqual(item.style, nextStyle)
					? null
					: { ...item, style: nextStyle };
			});

			const patchKeys = Object.keys(stylePatch);
			updatePreviewPatch(textItemId, (current) => {
				const previousStyle = current.style;
				if (!previousStyle) return null;

				const nextStyle = { ...previousStyle } as Record<
					string,
					unknown
				>;
				let hasChanges = false;
				for (const key of patchKeys) {
					if (key in nextStyle) {
						delete nextStyle[key];
						hasChanges = true;
					}
				}
				if (!hasChanges) return null;

				const next = { ...current };
				if (Object.keys(nextStyle).length === 0) {
					delete next.style;
				} else {
					next.style = nextStyle as Partial<TextStyle>;
				}
				return next;
			});
		},
		[setVideoDraft, updatePreviewPatch],
	);

	const handleUpdateTextItemPosition = useCallback(
		(textItemId: number, position: { left: number; top: number }) => {
			const nextPosition = normalizePosition(position);
			updateVideoTextItem(setVideoDraft, textItemId, (item) => {
				const previous = readItemPosition(item);
				if (
					previous.left === nextPosition.left &&
					previous.top === nextPosition.top
				) {
					return null;
				}
				return { ...item, position: nextPosition };
			});
			clearPreviewKeys(textItemId, ['position']);
		},
		[clearPreviewKeys, setVideoDraft],
	);

	const handleUpdateTextItemWidth = useCallback(
		(textItemId: number, width: number) => {
			const nextWidth = normalizeWidth(width);
			updateVideoTextItem(setVideoDraft, textItemId, (item) =>
				item.width === nextWidth ? null : { ...item, width: nextWidth },
			);
			clearPreviewKeys(textItemId, ['width']);
		},
		[clearPreviewKeys, setVideoDraft],
	);

	const handlePatchTextItemTimeline = useCallback(
		(textItemId: number, patch: TextItemTimelinePatch) => {
			const hasValuePatch = typeof patch.value === 'string';
			const hasStartTimePatch =
				typeof patch.startTime === 'number' &&
				Number.isFinite(patch.startTime);
			const hasDurationPatch =
				typeof patch.duration === 'number' &&
				Number.isFinite(patch.duration);
			const hasTimingPatch = hasStartTimePatch || hasDurationPatch;

			if (!hasValuePatch && !hasTimingPatch) return;

			updateVideoTextItem(
				setVideoDraft,
				textItemId,
				(item) => {
					const nextValue = hasValuePatch
						? (patch.value ?? '')
						: item.value;

					if (!hasTimingPatch) {
						return nextValue === item.value
							? null
							: { ...item, value: nextValue };
					}

					const nextStartTime = hasStartTimePatch
						? Math.max(0, Math.floor(patch.startTime as number))
						: item.startTime;
					const currentDuration = getTextItemDurationMs(item);
					const nextDuration = hasDurationPatch
						? Math.max(0, Math.floor(patch.duration as number))
						: currentDuration;
					const nextEndTime = nextStartTime + nextDuration;

					const shouldUpdateValue = nextValue !== item.value;
					const shouldUpdateTiming =
						nextStartTime !== item.startTime ||
						nextDuration !== currentDuration ||
						nextEndTime !== item.endTime;

					if (!shouldUpdateValue && !shouldUpdateTiming) return null;

					return {
						...item,
						value: nextValue,
						startTime: nextStartTime,
						duration: nextDuration,
						endTime: nextEndTime,
					};
				},
				{ recomputeDuration: hasTimingPatch },
			);
		},
		[setVideoDraft],
	);

	const handleDeleteTextItem = useCallback(
		(textItemId: number) => {
			setVideoText(setVideoDraft, (previousItems) => {
				const nextItems = previousItems.filter(
					(item) => item.id !== textItemId,
				);
				return nextItems.length === previousItems.length
					? null
					: nextItems;
			});
		},
		[setVideoDraft],
	);

	const handleAppendTextItem = useCallback((): number => {
		const currentItems = textItemsRef.current;
		const nextId =
			currentItems.length === 0
				? 1
				: Math.max(...currentItems.map((item) => item.id)) + 1;

		const lastItem =
			currentItems.length === 0
				? null
				: currentItems.reduce((latest, item) =>
						item.startTime > latest.startTime ? item : latest,
					);
		const nextStartTime = lastItem
			? lastItem.startTime + Math.max(0, lastItem.duration ?? 0)
			: 0;

		const nextItem: TextItem = {
			id: nextId,
			value: '',
			startTime: nextStartTime,
			duration: 3000,
			position: { left: 50, top: 50 },
			scale: 100,
			width: EDITOR_TEXT_DEFAULT_WIDTH_PERCENT,
		};

		setVideoText(setVideoDraft, (previousItems) => [
			...previousItems,
			nextItem,
		]);

		return nextId;
	}, [setVideoDraft]);

	return {
		videoPreviewDraft,
		handlePreviewTextItemPosition,
		handlePreviewTextItemScale,
		handlePreviewTextItemStyle,
		handlePreviewTextItemWidth,
		handleReorderTextItems,
		resetTextPreviewState,
		handleUpdateTextItemScale,
		handleUpdateTextItemStyle,
		handleUpdateTextItemPosition,
		handleUpdateTextItemWidth,
		handlePatchTextItemTimeline,
		handleAppendTextItem,
		handleDeleteTextItem,
	};
}
