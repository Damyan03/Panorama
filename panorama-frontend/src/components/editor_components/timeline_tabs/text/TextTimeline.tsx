import { memo } from 'react';
import { useTextTimelineBehaviour } from '../../../../hooks/editor/text/useTextTimelineBehaviour';
import {
	EMPTY_TEXT_TIMELINE_COLOR_PRESETS,
	type TextTimelineComparableProps,
} from '../../../../utils/editor/textColors';
import { areTextTimelinePropsEqual } from '../../../../utils/editor/textOptimise';
import { TextTimelineRow } from './TextTimelineFields';

type TextTimelineProps = TextTimelineComparableProps;

function TextTimeline({
	textItems,
	onReorder,
	onScalePreviewChange,
	onScaleChange,
	onStylePreviewChange,
	onStyleChange,
	onTimelinePatch,
	onSeek,
	onAddTextItem,
	onDeleteTextItem,
}: TextTimelineProps) {
	const {
		sortedTextItems,
		displayItems,
		rowHandlers,
		draggingId,
		isTouchDragging,
		effectiveActiveSettingsItemId,
		draftColorPresetsByChannel,
		scrollContainerRef,
		resetDragState,
		handleContainerTouchMove,
		handleContainerTouchEnd,
		handleContainerDragOver,
		handleContainerDrop,
		handleAddTextItem,
	} = useTextTimelineBehaviour({
		textItems,
		onReorder,
		onTimelinePatch,
		onSeek,
		onAddTextItem,
		onDeleteTextItem,
	});

	const addButton = onAddTextItem ? (
		<button
			type="button"
			onClick={handleAddTextItem}
			className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm text-text-muted transition-colors hover:bg-bg-elevated/30 hover:text-text-primary"
			aria-label="Add text item"
		>
			<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border text-xs font-semibold">
				+
			</span>
			<span>Add text</span>
		</button>
	) : null;

	if (sortedTextItems.length === 0) {
		return (
			<div className="card flex flex-col">
				<div className="flex-center p-6 text-muted">
					No text items yet.
				</div>
				{addButton}
			</div>
		);
	}

	return (
		<div
			ref={scrollContainerRef}
			className="card h-[min(25rem,calc(100dvh-12rem))] overflow-x-hidden overflow-y-auto md:h-100"
			style={{ overflowAnchor: 'none' }}
		>
			<div className="border-b border-border px-4 py-2 text-label-sm">
				Text timeline
			</div>
			<div
				className={`flex flex-col ${
					isTouchDragging ? 'touch-none select-none' : 'touch-pan-y'
				}`}
				onDragOver={handleContainerDragOver}
				onDrop={handleContainerDrop}
				onTouchMove={handleContainerTouchMove}
				onTouchEnd={handleContainerTouchEnd}
				onTouchCancel={resetDragState}
			>
				{displayItems.map((item, index) => {
					const isActiveItem =
						effectiveActiveSettingsItemId === item.id;

					return (
						<TextTimelineRow
							key={item.id}
							item={item}
							index={index}
							isActiveItem={isActiveItem}
							isDraggingItem={draggingId === item.id}
							rowHandlers={rowHandlers}
							onScaleChange={
								isActiveItem ? onScaleChange : undefined
							}
							onScalePreviewChange={
								isActiveItem ? onScalePreviewChange : undefined
							}
							onStylePreviewChange={
								isActiveItem ? onStylePreviewChange : undefined
							}
							onStyleChange={
								isActiveItem ? onStyleChange : undefined
							}
							colorPresets={
								isActiveItem
									? draftColorPresetsByChannel
									: EMPTY_TEXT_TIMELINE_COLOR_PRESETS
							}
						/>
					);
				})}
			</div>
			{addButton && (
				<div className="border-t border-border/50">{addButton}</div>
			)}
		</div>
	);
}

export default memo(TextTimeline, areTextTimelinePropsEqual);
