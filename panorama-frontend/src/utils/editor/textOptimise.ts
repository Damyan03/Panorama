import type { TextItem, TextStyle } from '../../types/video';
import {
	areArraysEqual,
	areShallowEqualByKeys,
	areStrictlyEqual,
} from '../optimise/equality';
import { areTextStylesEqual } from './textStyle';
import {
	EMPTY_TEXT_TIMELINE_COLOR_PRESETS,
	type DraftTextColorPresetsByChannel,
	type TextTimelineComparableProps,
} from './textColors';

const TEXT_TIMELINE_HANDLER_KEYS = [
	'onReorder',
	'onScalePreviewChange',
	'onScaleChange',
	'onStylePreviewChange',
	'onStyleChange',
	'onTimelinePatch',
	'onSeek',
	'onAddTextItem',
	'onDeleteTextItem',
] as const satisfies readonly (keyof TextTimelineComparableProps)[];

const TEXT_TIMELINE_ROW_BASE_KEYS = [
	'id',
	'startTime',
	'value',
	'duration',
] as const satisfies readonly (keyof TextItem)[];

const TEXT_STYLE_PANEL_HANDLER_KEYS = [
	'onScalePreviewChange',
	'onScaleChange',
	'onStylePreviewChange',
	'onStyleChange',
] as const satisfies readonly (keyof TextStylePanelComparableProps)[];

function areTextTimelineItemsEqual(itemA: TextItem, itemB: TextItem) {
	if (
		!areShallowEqualByKeys(itemA, itemB, TEXT_TIMELINE_ROW_BASE_KEYS) ||
		(itemA.scale ?? 100) !== (itemB.scale ?? 100)
	) {
		return false;
	}

	return areTextStylesEqual(itemA.style, itemB.style);
}

export function areReadonlyStringArraysEqual(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined,
) {
	return areArraysEqual(left, right, areStrictlyEqual, {
		treatUndefinedAsEmpty: true,
	});
}

export function areTextItemsTimelineEqual(
	itemsA: TextItem[],
	itemsB: TextItem[],
) {
	return areArraysEqual(itemsA, itemsB, areTextTimelineItemsEqual);
}

export function areTextTimelinePropsEqual(
	previous: TextTimelineComparableProps,
	next: TextTimelineComparableProps,
) {
	if (!areShallowEqualByKeys(previous, next, TEXT_TIMELINE_HANDLER_KEYS)) {
		return false;
	}

	return areTextItemsTimelineEqual(previous.textItems, next.textItems);
}

export function areTextTimelineColorPresetsEqual(
	previous: DraftTextColorPresetsByChannel | undefined,
	next: DraftTextColorPresetsByChannel | undefined,
) {
	const previousPresets = previous ?? EMPTY_TEXT_TIMELINE_COLOR_PRESETS;
	const nextPresets = next ?? EMPTY_TEXT_TIMELINE_COLOR_PRESETS;

	return (
		areReadonlyStringArraysEqual(previousPresets.text, nextPresets.text) &&
		areReadonlyStringArraysEqual(previousPresets.edge, nextPresets.edge) &&
		areReadonlyStringArraysEqual(previousPresets.shadow, nextPresets.shadow)
	);
}

export function areTextTimelineRowItemsEqual(
	previous: TextItem,
	next: TextItem,
	includeStyleFields: boolean,
) {
	if (!areShallowEqualByKeys(previous, next, TEXT_TIMELINE_ROW_BASE_KEYS)) {
		return false;
	}

	if (!includeStyleFields) {
		return true;
	}

	if ((previous.scale ?? 100) !== (next.scale ?? 100)) {
		return false;
	}

	return areTextStylesEqual(previous.style, next.style);
}

export type TextStylePanelComparableProps = {
	textItem: TextItem;
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
	textColorPresets?: readonly string[];
	edgeColorPresets?: readonly string[];
	shadowColorPresets?: readonly string[];
};

export function areTextStylePanelPropsEqual(
	previous: TextStylePanelComparableProps,
	next: TextStylePanelComparableProps,
) {
	if (
		!areShallowEqualByKeys(previous, next, TEXT_STYLE_PANEL_HANDLER_KEYS) ||
		previous.textItem.id !== next.textItem.id
	) {
		return false;
	}

	if (
		!areReadonlyStringArraysEqual(
			previous.textColorPresets,
			next.textColorPresets,
		) ||
		!areReadonlyStringArraysEqual(
			previous.edgeColorPresets,
			next.edgeColorPresets,
		) ||
		!areReadonlyStringArraysEqual(
			previous.shadowColorPresets,
			next.shadowColorPresets,
		)
	) {
		return false;
	}

	if ((previous.textItem.scale ?? 100) !== (next.textItem.scale ?? 100)) {
		return false;
	}

	return areTextStylesEqual(previous.textItem.style, next.textItem.style);
}
