import type { ChangeEvent, DragEvent, TouchEvent } from 'react';
import type { TextItem, TextStyle } from '../../types/video';
import { areShallowEqualByKeys } from '../optimise/equality';
import type { DraftTextColorPresetsByChannel } from './textColors';
import {
	areTextTimelineColorPresetsEqual,
	areTextTimelineRowItemsEqual,
} from './textOptimise';

const TEXT_TIMELINE_ROW_STATE_KEYS = [
	'index',
	'isActiveItem',
	'isDraggingItem',
	'rowHandlers',
] as const satisfies readonly (keyof TextTimelineRowComparableProps)[];

export type TextTimelineRowHandlers = {
	isReorderEnabled: boolean;
	onSetItemNode: (itemId: number, node: HTMLDivElement | null) => void;
	onDragOverRow: (
		event: DragEvent<HTMLDivElement>,
		targetItemId: number,
	) => void;
	onRowDrop: (event: DragEvent<HTMLDivElement>) => void;
	onActivateItem: (itemId: number, startTimeMs: number) => void;
	onCollapseEditingPanel: () => void;
	onDragHandleStart: (
		event: DragEvent<HTMLSpanElement>,
		itemId: number,
	) => void;
	onDragHandleEnd: () => void;
	onTouchStartItem: (event: TouchEvent<HTMLElement>, itemId: number) => void;
	onTimelineValueChange: (
		textItemId: number,
		event: ChangeEvent<HTMLInputElement>,
	) => void;
	onTimelineStartTimeCommit: (
		textItemId: number,
		nextValueMs: number,
	) => void;
	onTimelineDurationCommit: (textItemId: number, nextValueMs: number) => void;
	onDeleteTextItem: (textItemId: number) => void;
};

export type TextTimelineRowComparableProps = {
	item: TextItem;
	index: number;
	isActiveItem: boolean;
	isDraggingItem: boolean;
	rowHandlers: TextTimelineRowHandlers;
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
	colorPresets?: DraftTextColorPresetsByChannel;
};

export type TimelineDurationFieldComparableProps = {
	label: string;
	valueMs: number;
	textItemId: number;
	onCommit: (textItemId: number, nextValueMs: number) => void;
};

export function areTimelineDurationFieldPropsEqual(
	previous: TimelineDurationFieldComparableProps,
	next: TimelineDurationFieldComparableProps,
) {
	return (
		previous.label === next.label &&
		previous.valueMs === next.valueMs &&
		previous.textItemId === next.textItemId
	);
}

export function areTextTimelineRowPropsEqual(
	previous: TextTimelineRowComparableProps,
	next: TextTimelineRowComparableProps,
) {
	if (!areShallowEqualByKeys(previous, next, TEXT_TIMELINE_ROW_STATE_KEYS)) {
		return false;
	}

	const includeStyleFields = previous.isActiveItem || next.isActiveItem;
	if (
		!areTextTimelineRowItemsEqual(
			previous.item,
			next.item,
			includeStyleFields,
		)
	) {
		return false;
	}

	if (!includeStyleFields) {
		return true;
	}

	if (
		previous.onScalePreviewChange !== next.onScalePreviewChange ||
		previous.onScaleChange !== next.onScaleChange ||
		previous.onStylePreviewChange !== next.onStylePreviewChange ||
		previous.onStyleChange !== next.onStyleChange
	) {
		return false;
	}

	return areTextTimelineColorPresetsEqual(
		previous.colorPresets,
		next.colorPresets,
	);
}
