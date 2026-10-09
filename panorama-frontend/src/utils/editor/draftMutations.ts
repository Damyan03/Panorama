import type { Dispatch, SetStateAction } from 'react';
import { getRecalculatedTotalDuration } from './draft';
import type { VideoData, TextItem } from '../../types/video';

export type DraftSetter = Dispatch<SetStateAction<VideoData | null>>;
export type TextItemBuilder = (item: TextItem) => TextItem | null;

type SetVideoTextOptions = { recomputeDuration?: boolean };

export function setVideoText(
	setDraft: DraftSetter,
	computeNextText: (previousText: TextItem[]) => TextItem[] | null,
	options?: SetVideoTextOptions,
) {
	setDraft((previous) => {
		if (!previous) return previous;

		const previousText = previous.content?.text ?? [];
		const nextText = computeNextText(previousText);
		if (!nextText) return previous;

		const nextDraft: VideoData = {
			...previous,
			content: { ...previous.content, text: nextText },
		};

		if (!options?.recomputeDuration) {
			return nextDraft;
		}

		nextDraft.totalDuration = getRecalculatedTotalDuration(
			previous.content?.images ?? [],
		);
		return nextDraft;
	});
}

export function updateVideoTextItem(
	setDraft: DraftSetter,
	textItemId: number,
	buildItem: TextItemBuilder,
	options?: SetVideoTextOptions,
) {
	setVideoText(
		setDraft,
		(previousText) => {
			const targetIndex = previousText.findIndex(
				(item) => item.id === textItemId,
			);
			if (targetIndex < 0) return null;

			const nextItem = buildItem(previousText[targetIndex]);
			if (!nextItem) return null;

			const nextText = [...previousText];
			nextText[targetIndex] = nextItem;
			return nextText;
		},
		options,
	);
}

export function setVideoField<
	K extends 'title' | 'description' | 'coverSrc',
>(setDraft: DraftSetter, key: K, value: VideoData[K]) {
	setDraft((previous) => {
		if (!previous || previous[key] === value) return previous;
		return { ...previous, [key]: value };
	});
}
