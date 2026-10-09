import {
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
	type MouseEvent,
	type TouchEvent,
} from 'react';
import { EMPTY_TEXT_TIMELINE_COLOR_PRESETS } from '../../../../utils/editor/textColors';
import {
	areTimelineDurationFieldPropsEqual,
	areTextTimelineRowPropsEqual,
	type TimelineDurationFieldComparableProps,
	type TextTimelineRowComparableProps,
} from '../../../../utils/editor/timelineOptimise';
import { formatTimeMs } from '../../../../utils/formatters/time';
import ConfirmDialog from '../../../ui/ConfirmDialog';
import Icon from '../../../Icon';
import { DurationInput } from '../../../ui/inputs';
import TextStyleSettingsPanel from './TextStylePanel';

const TimelineDurationField = memo(function TimelineDurationField({
	label,
	valueMs,
	textItemId,
	onCommit,
}: TimelineDurationFieldComparableProps) {
	const onCommitRef = useRef(onCommit);

	useEffect(() => {
		onCommitRef.current = onCommit;
	}, [onCommit]);

	const handleCommitMs = useCallback(
		(nextValueMs: number) => {
			onCommitRef.current(textItemId, nextValueMs);
		},
		[textItemId],
	);

	return (
		<div className="flex flex-col gap-1">
			<span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
				{label}
			</span>
			<DurationInput
				valueMs={valueMs}
				onCommitMs={handleCommitMs}
				className="h-9"
			/>
		</div>
	);
}, areTimelineDurationFieldPropsEqual);

// Animates children open/closed using the CSS grid row trick.
// Mounts on open, unmounts after close transition completes.
function PanelAnimationWrapper({
	isOpen,
	children,
}: {
	isOpen: boolean;
	children: React.ReactNode;
}) {
	const [shouldRender, setShouldRender] = useState(isOpen);
	const [isExpanded, setIsExpanded] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setShouldRender(true);
			// Defer expansion so the browser paints the 0fr state first,
			// allowing the CSS transition to run from closed → open.
			const id = window.requestAnimationFrame(() => setIsExpanded(true));
			return () => window.cancelAnimationFrame(id);
		} else {
			setIsExpanded(false);
		}
	}, [isOpen]);

	if (!shouldRender) return null;

	return (
		<div
			className="grid transition-[grid-template-rows] duration-200 ease-in-out"
			style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
			onTransitionEnd={() => {
				if (!isOpen) setShouldRender(false);
			}}
		>
			<div className="overflow-hidden">{children}</div>
		</div>
	);
}

export type TextTimelineRowProps = TextTimelineRowComparableProps;

export const TextTimelineRow = memo(function TextTimelineRow({
	item,
	index,
	isActiveItem,
	isDraggingItem,
	rowHandlers,
	onScalePreviewChange,
	onScaleChange,
	onStylePreviewChange,
	onStyleChange,
	colorPresets = EMPTY_TEXT_TIMELINE_COLOR_PRESETS,
}: TextTimelineRowProps) {
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

	const {
		isReorderEnabled,
		onSetItemNode,
		onDragOverRow,
		onRowDrop,
		onActivateItem,
		onCollapseEditingPanel,
		onDragHandleStart,
		onDragHandleEnd,
		onTouchStartItem,
		onTimelineValueChange,
		onTimelineStartTimeCommit,
		onTimelineDurationCommit,
		onDeleteTextItem,
	} = rowHandlers;

	const rowBackgroundClass =
		index % 2 === 0 ? 'bg-bg-elevated/25' : 'bg-bg-secondary/45';
	const dimmedClass = isDraggingItem ? 'opacity-60' : '';
	const activeRowContainerClass = isActiveItem
		? `${rowBackgroundClass} border-y border-border/50`
		: '';
	const layoutClass = isActiveItem
		? 'px-4 py-3'
		: 'flex items-center gap-3 px-4 py-3';

	const handleSetNodeRef = useCallback(
		(node: HTMLDivElement | null) => {
			onSetItemNode(item.id, node);
		},
		[item.id, onSetItemNode],
	);

	const handleRowClick = useCallback(() => {
		onActivateItem(item.id, item.startTime);
	}, [item.id, item.startTime, onActivateItem]);

	const handleRowDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			onDragOverRow(event, item.id);
		},
		[item.id, onDragOverRow],
	);

	const handleTextDragStart = useCallback(
		(event: DragEvent<HTMLSpanElement>) => {
			onDragHandleStart(event, item.id);
		},
		[item.id, onDragHandleStart],
	);

	const handleTextTouchStart = useCallback(
		(event: TouchEvent<HTMLSpanElement>) => {
			onTouchStartItem(event, item.id);
		},
		[item.id, onTouchStartItem],
	);

	const handleValueChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			onTimelineValueChange(item.id, event);
		},
		[item.id, onTimelineValueChange],
	);

	const handleDeleteClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			setConfirmDeleteOpen(true);
		},
		[],
	);

	const handleConfirmDelete = useCallback(() => {
		setConfirmDeleteOpen(false);
		onDeleteTextItem(item.id);
	}, [item.id, onDeleteTextItem]);

	const handleCancelDelete = useCallback(() => {
		setConfirmDeleteOpen(false);
	}, []);

	const deleteButton = (
		<button
			type="button"
			onClick={handleDeleteClick}
			className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-bg-secondary p-1 text-text-muted transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
			aria-label="Delete text item"
		>
			<Icon name="delete" />
		</button>
	);

	return (
		<div
			className={`flex flex-col ${activeRowContainerClass} ${dimmedClass}`}
		>
			<div
				ref={handleSetNodeRef}
				onDragOver={handleRowDragOver}
				onDrop={onRowDrop}
				onClick={isActiveItem ? undefined : handleRowClick}
				className={`${layoutClass} will-change-transform ${
					isActiveItem ? '' : rowBackgroundClass
				}`}
			>
				{isActiveItem ? (
					<>
						<div className="mb-2 flex items-center justify-between gap-2">
							<span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
								editing text
							</span>
							<div className="flex items-center gap-1">
								{deleteButton}
								<button
									type="button"
									onClick={onCollapseEditingPanel}
									className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-bg-secondary text-text-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
									aria-label="Collapse text editing panel"
								>
									<Icon name="close" />
								</button>
							</div>
						</div>
						<input
							type="text"
							value={item.value}
							onChange={handleValueChange}
							className="h-10 w-full rounded border border-border bg-bg-secondary px-3 text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-focus-ring"
							placeholder="Text"
							aria-label="Text content"
						/>
						<div className="mt-2 grid grid-cols-2 gap-2">
							<TimelineDurationField
								label="Start time"
								valueMs={item.startTime}
								textItemId={item.id}
								onCommit={onTimelineStartTimeCommit}
							/>
							<TimelineDurationField
								label="Duration"
								valueMs={item.duration ?? 0}
								textItemId={item.id}
								onCommit={onTimelineDurationCommit}
							/>
						</div>
					</>
				) : (
					<>
						<span className="min-w-14 text-label-sm text-text-muted">
							{formatTimeMs(item.startTime)}
						</span>
						<span
							draggable={isReorderEnabled}
							onDragStart={handleTextDragStart}
							onDragEnd={onDragHandleEnd}
							onTouchStart={handleTextTouchStart}
							className={`text-sm ${
								isReorderEnabled
									? 'touch-none select-none hover:cursor-grab active:cursor-grabbing'
									: ''
							}`}
						>
							{item.value || 'Untitled text item'}
						</span>
						{deleteButton}
					</>
				)}
			</div>
			<PanelAnimationWrapper isOpen={isActiveItem}>
				<TextStyleSettingsPanel
					textItem={item}
					onScalePreviewChange={onScalePreviewChange}
					onScaleChange={onScaleChange}
					onStylePreviewChange={onStylePreviewChange}
					onStyleChange={onStyleChange}
					textColorPresets={colorPresets.text}
					edgeColorPresets={colorPresets.edge}
					shadowColorPresets={colorPresets.shadow}
				/>
			</PanelAnimationWrapper>
			<ConfirmDialog
				open={confirmDeleteOpen}
				title="Delete text item?"
				message={`"${item.value || 'Untitled text item'}" will be permanently removed.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				onConfirm={handleConfirmDelete}
				onCancel={handleCancelDelete}
			/>
		</div>
	);
}, areTextTimelineRowPropsEqual);
