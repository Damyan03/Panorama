import type { TextItem, TextStyle } from '../../types/video';
import { normalizeTextStyle } from './textStyle';

const MAX_DRAFT_COLOR_PRESETS = 24;

export const EMPTY_COLOR_PRESETS: readonly string[] = Object.freeze([]);

export type DraftTextColorPresetsByChannel = {
	text: readonly string[];
	edge: readonly string[];
	shadow: readonly string[];
};

export const EMPTY_TEXT_TIMELINE_COLOR_PRESETS: DraftTextColorPresetsByChannel =
	Object.freeze({
		text: EMPTY_COLOR_PRESETS,
		edge: EMPTY_COLOR_PRESETS,
		shadow: EMPTY_COLOR_PRESETS,
	});

export type DraftTextColorPresetGroup = {
	label: string;
	colors: readonly string[];
};

export type TextTimelineComparableProps = {
	textItems: TextItem[];
	onReorder?: (nextTextItems: TextItem[]) => void;
	onScalePreviewChange?: (textItemId: number, scale: number) => void;
	onScaleChange?: (textItemId: number, scale: number) => void;
	onStylePreviewChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onStyleChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onTimelinePatch?: (
		textItemId: number,
		patch: Partial<Pick<TextItem, 'value' | 'startTime' | 'duration'>>,
	) => void;
	onSeek?: (elapsedMs: number) => void;
	onAddTextItem?: () => number;
	onDeleteTextItem?: (textItemId: number) => void;
};

function appendUniqueColor(
	collectedColors: string[],
	seenColors: Set<string>,
	candidateColor: string,
) {
	if (collectedColors.length >= MAX_DRAFT_COLOR_PRESETS) {
		return;
	}

	const normalizedColor = candidateColor.toLowerCase();
	if (seenColors.has(normalizedColor)) {
		return;
	}

	seenColors.add(normalizedColor);
	collectedColors.push(normalizedColor);
}

export function collectDraftTextColorPresetsByChannel(
	textItems: TextItem[],
): DraftTextColorPresetsByChannel {
	const textColors: string[] = [];
	const edgeColors: string[] = [];
	const shadowColors: string[] = [];
	const seenTextColors = new Set<string>();
	const seenEdgeColors = new Set<string>();
	const seenShadowColors = new Set<string>();

	for (const item of textItems) {
		const style = normalizeTextStyle(item.style);
		appendUniqueColor(textColors, seenTextColors, style.color);
		appendUniqueColor(edgeColors, seenEdgeColors, style.edgeColor);
		appendUniqueColor(
			shadowColors,
			seenShadowColors,
			style.dropShadowColor,
		);
	}

	return {
		text: textColors,
		edge: edgeColors,
		shadow: shadowColors,
	};
}

function collectUniqueColors(colorGroups: ReadonlyArray<readonly string[]>) {
	const collectedColors: string[] = [];
	const seenColors = new Set<string>();

	for (const group of colorGroups) {
		for (const color of group) {
			if (seenColors.has(color)) {
				continue;
			}

			seenColors.add(color);
			collectedColors.push(color);
		}
	}

	return collectedColors;
}

export function buildDraftTextColorPresetGroups(
	channelLabel: string,
	currentChannelColors: readonly string[],
	otherChannelColors: ReadonlyArray<readonly string[]>,
): readonly DraftTextColorPresetGroup[] {
	return [
		{
			label: `Used in this draft - ${channelLabel}`,
			colors: currentChannelColors,
		},
		{
			label: 'Used in this draft - Other',
			colors: collectUniqueColors(otherChannelColors),
		},
	];
}
