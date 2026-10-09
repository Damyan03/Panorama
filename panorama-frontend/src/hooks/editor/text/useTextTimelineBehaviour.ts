import {
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type DragEvent,
	type TouchEvent,
} from 'react';
import type { TextItem } from '../../../types/video';
import {
	type TextTimelineComparableProps,
	collectDraftTextColorPresetsByChannel,
} from '../../../utils/editor/textColors';
import {
	captureRectsByItemId,
	playFlipAnimation,
} from '../../../utils/timeline/animations';
import {
	isSameOrderById,
	recalculateSequentialTimings,
	reorderImages as reorderItemsByInsertionIndex,
} from '../../../utils/timeline/core';

const TOUCH_DRAG_THRESHOLD_PX = 6;
const AUTO_SCROLL_EDGE_THRESHOLD_PX = 56;
const AUTO_SCROLL_MAX_STEP_PX = 14;

type UseTextTimelineBehaviourParams = Pick<
	TextTimelineComparableProps,
	| 'textItems'
	| 'onReorder'
	| 'onTimelinePatch'
	| 'onSeek'
	| 'onAddTextItem'
	| 'onDeleteTextItem'
>;

export function useTextTimelineBehaviour({
	textItems,
	onReorder,
	onTimelinePatch,
	onSeek,
	onAddTextItem,
	onDeleteTextItem,
}: UseTextTimelineBehaviourParams) {
	const sortedTextItems = useMemo(
		() => [...textItems].sort((a, b) => a.startTime - b.startTime),
		[textItems],
	);
	const sortedTextItemsRef = useRef<TextItem[]>(sortedTextItems);
	sortedTextItemsRef.current = sortedTextItems;
	const onReorderRef = useRef(onReorder);
	onReorderRef.current = onReorder;
	const onTimelinePatchRef = useRef(onTimelinePatch);
	onTimelinePatchRef.current = onTimelinePatch;
	const onSeekRef = useRef(onSeek);
	onSeekRef.current = onSeek;
	const isReorderEnabled = typeof onReorder === 'function';
	const draggingIdRef = useRef<number | null>(null);
	const dragPreviewItemsRef = useRef<TextItem[] | null>(null);
	const touchIdentifierRef = useRef<number | null>(null);
	const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
	const touchMovedRef = useRef(false);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const autoScrollFrameRef = useRef<number | null>(null);
	const autoScrollDeltaRef = useRef(0);
	const autoScrollPointerClientYRef = useRef<number | null>(null);
	const previousRectsRef = useRef<Map<number, DOMRect> | null>(null);
	const itemNodesByIdRef = useRef<Map<number, HTMLDivElement | null>>(
		new Map(),
	);
	const [activeSettingsItemId, setActiveSettingsItemId] = useState<
		number | null
	>(null);
	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [isTouchDragging, setIsTouchDragging] = useState(false);
	const [dragPreviewItems, setDragPreviewItems] = useState<TextItem[] | null>(
		null,
	);
	const displayItems = dragPreviewItems ?? sortedTextItems;
	const draftColorPresetsByChannel = useMemo(() => {
		return collectDraftTextColorPresetsByChannel(sortedTextItems);
	}, [sortedTextItems]);

	const handleTimelineValueChange = useCallback(
		(textItemId: number, event: ChangeEvent<HTMLInputElement>) => {
			onTimelinePatchRef.current?.(textItemId, {
				value: event.target.value,
			});
		},
		[],
	);

	const handleTimelineStartTimeCommit = useCallback(
		(textItemId: number, nextValueMs: number) => {
			onTimelinePatchRef.current?.(textItemId, {
				startTime: Math.max(0, Math.floor(nextValueMs)),
			});
		},
		[],
	);

	const handleTimelineDurationCommit = useCallback(
		(textItemId: number, nextValueMs: number) => {
			onTimelinePatchRef.current?.(textItemId, {
				duration: Math.max(0, Math.floor(nextValueMs)),
			});
		},
		[],
	);

	const handleCollapseEditingPanel = useCallback(() => {
		setActiveSettingsItemId(null);
	}, []);

	const effectiveActiveSettingsItemId = useMemo(() => {
		if (
			activeSettingsItemId === null ||
			!sortedTextItems.some((item) => item.id === activeSettingsItemId)
		) {
			return null;
		}
		return activeSettingsItemId;
	}, [activeSettingsItemId, sortedTextItems]);

	const captureItemRects = useCallback((items: TextItem[]) => {
		const nodesById = itemNodesByIdRef.current;
		previousRectsRef.current = captureRectsByItemId(items, (item) =>
			nodesById.get(item.id),
		);
	}, []);

	const stopAutoScroll = useCallback(() => {
		if (autoScrollFrameRef.current !== null) {
			window.cancelAnimationFrame(autoScrollFrameRef.current);
			autoScrollFrameRef.current = null;
		}

		autoScrollDeltaRef.current = 0;
		autoScrollPointerClientYRef.current = null;
	}, []);

	const resetDragState = useCallback(() => {
		stopAutoScroll();
		draggingIdRef.current = null;
		dragPreviewItemsRef.current = null;
		touchIdentifierRef.current = null;
		touchStartPointRef.current = null;
		touchMovedRef.current = false;
		setDraggingId(null);
		setIsTouchDragging(false);
		setDragPreviewItems(null);
	}, [stopAutoScroll]);

	const beginDrag = useCallback((itemId: number) => {
		const currentSortedItems = sortedTextItemsRef.current;
		draggingIdRef.current = itemId;
		setDraggingId(itemId);

		if (dragPreviewItemsRef.current === null) {
			dragPreviewItemsRef.current = currentSortedItems;
			setDragPreviewItems(currentSortedItems);
		}
	}, []);

	const commitDrop = useCallback(() => {
		const reorderHandler = onReorderRef.current;
		const currentSortedItems = sortedTextItemsRef.current;
		const draggedId = draggingIdRef.current;
		const previewItems = dragPreviewItemsRef.current;

		if (!reorderHandler || draggedId === null || !previewItems) {
			resetDragState();
			return;
		}

		if (isSameOrderById(previewItems, currentSortedItems)) {
			resetDragState();
			return;
		}

		reorderHandler(
			recalculateSequentialTimings(
				previewItems,
				(item) => item.duration ?? 0,
			),
		);
		resetDragState();
	}, [resetDragState]);

	const applyReorderPreview = useCallback(
		(insertionIndex: number) => {
			const draggedId = draggingIdRef.current;
			if (draggedId === null) {
				return false;
			}

			const currentItems =
				dragPreviewItemsRef.current ?? sortedTextItemsRef.current;
			const fromIndex = currentItems.findIndex(
				(item) => item.id === draggedId,
			);
			if (fromIndex < 0) {
				return false;
			}

			const nextItems = reorderItemsByInsertionIndex(
				currentItems,
				fromIndex,
				insertionIndex,
			);

			if (isSameOrderById(currentItems, nextItems)) {
				return false;
			}

			captureItemRects(currentItems);
			dragPreviewItemsRef.current = nextItems;
			setDragPreviewItems(nextItems);
			return true;
		},
		[captureItemRects],
	);

	const stepAutoScroll = useCallback(() => {
		autoScrollFrameRef.current = null;

		const scrollContainer = scrollContainerRef.current;
		const scrollDelta = autoScrollDeltaRef.current;
		const pointerClientY = autoScrollPointerClientYRef.current;
		if (
			!scrollContainer ||
			scrollDelta === 0 ||
			pointerClientY === null ||
			draggingIdRef.current === null
		) {
			return;
		}

		const maxScrollTop = Math.max(
			0,
			scrollContainer.scrollHeight - scrollContainer.clientHeight,
		);
		const previousScrollTop = scrollContainer.scrollTop;
		const nextScrollTop = Math.min(
			maxScrollTop,
			Math.max(0, previousScrollTop + scrollDelta),
		);

		if (nextScrollTop !== previousScrollTop) {
			scrollContainer.scrollTop = nextScrollTop;

			const currentItems =
				dragPreviewItemsRef.current ?? sortedTextItemsRef.current;
			let insertionIndex = currentItems.length;
			for (let index = 0; index < currentItems.length; index += 1) {
				const node = itemNodesByIdRef.current.get(
					currentItems[index].id,
				);
				if (!node) {
					continue;
				}

				const rect = node.getBoundingClientRect();
				const midpoint = rect.top + rect.height / 2;
				if (pointerClientY < midpoint) {
					insertionIndex = index;
					break;
				}
			}

			applyReorderPreview(insertionIndex);
		}

		const reachedTop = scrollContainer.scrollTop <= 0;
		const reachedBottom = scrollContainer.scrollTop >= maxScrollTop;
		if (
			(scrollDelta < 0 && reachedTop) ||
			(scrollDelta > 0 && reachedBottom)
		) {
			autoScrollDeltaRef.current = 0;
		}

		if (
			autoScrollDeltaRef.current !== 0 &&
			draggingIdRef.current !== null
		) {
			autoScrollFrameRef.current =
				window.requestAnimationFrame(stepAutoScroll);
		}
	}, [applyReorderPreview]);

	const updateAutoScrollFromClientY = useCallback(
		(clientY: number) => {
			const scrollContainer = scrollContainerRef.current;
			if (!scrollContainer || draggingIdRef.current === null) {
				stopAutoScroll();
				return;
			}

			autoScrollPointerClientYRef.current = clientY;

			const containerRect = scrollContainer.getBoundingClientRect();
			const distanceToTop = clientY - containerRect.top;
			const distanceToBottom = containerRect.bottom - clientY;
			let nextScrollDelta = 0;

			if (distanceToTop < AUTO_SCROLL_EDGE_THRESHOLD_PX) {
				const intensity =
					(AUTO_SCROLL_EDGE_THRESHOLD_PX - distanceToTop) /
					AUTO_SCROLL_EDGE_THRESHOLD_PX;
				nextScrollDelta = -Math.max(
					1,
					Math.ceil(intensity * AUTO_SCROLL_MAX_STEP_PX),
				);
			} else if (distanceToBottom < AUTO_SCROLL_EDGE_THRESHOLD_PX) {
				const intensity =
					(AUTO_SCROLL_EDGE_THRESHOLD_PX - distanceToBottom) /
					AUTO_SCROLL_EDGE_THRESHOLD_PX;
				nextScrollDelta = Math.max(
					1,
					Math.ceil(intensity * AUTO_SCROLL_MAX_STEP_PX),
				);
			}

			const maxScrollTop = Math.max(
				0,
				scrollContainer.scrollHeight - scrollContainer.clientHeight,
			);
			if (
				(nextScrollDelta < 0 && scrollContainer.scrollTop <= 0) ||
				(nextScrollDelta > 0 &&
					scrollContainer.scrollTop >= maxScrollTop)
			) {
				nextScrollDelta = 0;
			}

			autoScrollDeltaRef.current = nextScrollDelta;
			if (nextScrollDelta === 0) {
				if (autoScrollFrameRef.current !== null) {
					window.cancelAnimationFrame(autoScrollFrameRef.current);
					autoScrollFrameRef.current = null;
				}
				return;
			}

			if (autoScrollFrameRef.current === null) {
				autoScrollFrameRef.current =
					window.requestAnimationFrame(stepAutoScroll);
			}
		},
		[stepAutoScroll, stopAutoScroll],
	);

	const handleDragOverRow = useCallback(
		(event: DragEvent<HTMLDivElement>, targetItemId: number) => {
			if (!isReorderEnabled) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			updateAutoScrollFromClientY(event.clientY);

			if (draggingIdRef.current === null) {
				return;
			}

			const currentItems =
				dragPreviewItemsRef.current ?? sortedTextItemsRef.current;
			const targetIndex = currentItems.findIndex(
				(item) => item.id === targetItemId,
			);
			if (targetIndex < 0) {
				return;
			}

			const rect = event.currentTarget.getBoundingClientRect();
			const insertionIndex =
				event.clientY < rect.top + rect.height / 2
					? targetIndex
					: targetIndex + 1;

			applyReorderPreview(insertionIndex);
		},
		[applyReorderPreview, isReorderEnabled, updateAutoScrollFromClientY],
	);

	const handleTouchStart = useCallback(
		(event: TouchEvent<HTMLElement>, itemId: number) => {
			if (!isReorderEnabled || event.touches.length === 0) {
				return;
			}

			const touch = event.touches[0];
			beginDrag(itemId);

			touchIdentifierRef.current = touch.identifier;
			touchStartPointRef.current = {
				x: touch.clientX,
				y: touch.clientY,
			};
			touchMovedRef.current = false;
			setIsTouchDragging(true);
		},
		[beginDrag, isReorderEnabled],
	);

	const handleContainerTouchMove = useCallback(
		(event: TouchEvent<HTMLDivElement>) => {
			if (!isReorderEnabled) {
				return;
			}

			const trackedTouchIdentifier = touchIdentifierRef.current;
			const draggedId = draggingIdRef.current;
			if (trackedTouchIdentifier === null || draggedId === null) {
				return;
			}

			const touch = Array.from(event.touches).find(
				(item) => item.identifier === trackedTouchIdentifier,
			);
			if (!touch) {
				return;
			}

			const startPoint = touchStartPointRef.current;
			if (!touchMovedRef.current && startPoint) {
				const dx = Math.abs(touch.clientX - startPoint.x);
				const dy = Math.abs(touch.clientY - startPoint.y);

				if (
					dx > TOUCH_DRAG_THRESHOLD_PX ||
					dy > TOUCH_DRAG_THRESHOLD_PX
				) {
					touchMovedRef.current = true;
				}
			}

			if (!touchMovedRef.current) {
				return;
			}

			if (event.cancelable) {
				event.preventDefault();
			}

			updateAutoScrollFromClientY(touch.clientY);

			const currentItems =
				dragPreviewItemsRef.current ?? sortedTextItemsRef.current;
			let insertionIndex = currentItems.length;
			for (let index = 0; index < currentItems.length; index += 1) {
				const node = itemNodesByIdRef.current.get(
					currentItems[index].id,
				);
				if (!node) {
					continue;
				}

				const rect = node.getBoundingClientRect();
				const midpoint = rect.top + rect.height / 2;
				if (touch.clientY < midpoint) {
					insertionIndex = index;
					break;
				}
			}

			applyReorderPreview(insertionIndex);
		},
		[applyReorderPreview, isReorderEnabled, updateAutoScrollFromClientY],
	);

	const handleContainerTouchEnd = useCallback(
		(event: TouchEvent<HTMLDivElement>) => {
			if (!isReorderEnabled) {
				return;
			}

			const trackedTouchIdentifier = touchIdentifierRef.current;
			if (trackedTouchIdentifier === null) {
				return;
			}

			const changedTouch = Array.from(event.changedTouches).find(
				(item) => item.identifier === trackedTouchIdentifier,
			);
			if (!changedTouch) {
				return;
			}

			if (touchMovedRef.current && event.cancelable) {
				event.preventDefault();
			}

			commitDrop();
		},
		[commitDrop, isReorderEnabled],
	);

	const setItemNode = useCallback(
		(itemId: number, node: HTMLDivElement | null) => {
			if (node) {
				itemNodesByIdRef.current.set(itemId, node);
			} else {
				itemNodesByIdRef.current.delete(itemId);
			}
		},
		[],
	);

	const handleRowDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!isReorderEnabled) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			commitDrop();
		},
		[commitDrop, isReorderEnabled],
	);

	const handleDragHandleStart = useCallback(
		(event: DragEvent<HTMLSpanElement>, itemId: number) => {
			if (!isReorderEnabled) {
				return;
			}

			beginDrag(itemId);

			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(itemId));
		},
		[beginDrag, isReorderEnabled],
	);

	const handleActivateItem = useCallback(
		(itemId: number, startTimeMs: number) => {
			if (draggingIdRef.current !== null) {
				return;
			}

			onSeekRef.current?.(startTimeMs);
			setActiveSettingsItemId((previous) =>
				previous === itemId ? null : itemId,
			);
		},
		[],
	);

	useLayoutEffect(() => {
		const nodesById = itemNodesByIdRef.current;
		const cleanup = playFlipAnimation(
			(id) => nodesById.get(id),
			previousRectsRef.current,
		);
		previousRectsRef.current = null;

		return cleanup;
	}, [displayItems]);

	// Scroll the activated row to the top of the container so the panel
	// always expands downward into view rather than off-screen.
	useLayoutEffect(() => {
		if (effectiveActiveSettingsItemId === null) return;

		const node = itemNodesByIdRef.current.get(
			effectiveActiveSettingsItemId,
		);
		const container = scrollContainerRef.current;
		if (!node || !container) return;

		const relativeTop =
			node.getBoundingClientRect().top -
			container.getBoundingClientRect().top;

		if (Math.abs(relativeTop) > 4) {
			container.scrollTo({
				top: container.scrollTop + relativeTop,
				behavior: 'smooth',
			});
		}
	}, [effectiveActiveSettingsItemId]);

	useLayoutEffect(() => {
		return () => {
			stopAutoScroll();
		};
	}, [stopAutoScroll]);

	const handleContainerDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!isReorderEnabled) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			updateAutoScrollFromClientY(event.clientY);
		},
		[isReorderEnabled, updateAutoScrollFromClientY],
	);

	const handleContainerDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!isReorderEnabled) {
				return;
			}

			event.preventDefault();
			commitDrop();
		},
		[commitDrop, isReorderEnabled],
	);

	const onDeleteTextItemRef = useRef(onDeleteTextItem);
	onDeleteTextItemRef.current = onDeleteTextItem;

	const handleDeleteTextItem = useCallback((textItemId: number) => {
		onDeleteTextItemRef.current?.(textItemId);
	}, []);

	const onAddTextItemRef = useRef(onAddTextItem);
	onAddTextItemRef.current = onAddTextItem;

	const handleAddTextItem = useCallback(() => {
		const newId = onAddTextItemRef.current?.();
		if (newId == null) return;

		setActiveSettingsItemId(newId);

		window.requestAnimationFrame(() => {
			const container = scrollContainerRef.current;
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		});
	}, []);

	const rowHandlers = useMemo(
		() => ({
			isReorderEnabled,
			onSetItemNode: setItemNode,
			onDragOverRow: handleDragOverRow,
			onRowDrop: handleRowDrop,
			onActivateItem: handleActivateItem,
			onCollapseEditingPanel: handleCollapseEditingPanel,
			onDragHandleStart: handleDragHandleStart,
			onDragHandleEnd: resetDragState,
			onTouchStartItem: handleTouchStart,
			onTimelineValueChange: handleTimelineValueChange,
			onTimelineStartTimeCommit: handleTimelineStartTimeCommit,
			onTimelineDurationCommit: handleTimelineDurationCommit,
			onDeleteTextItem: handleDeleteTextItem,
		}),
		[
			isReorderEnabled,
			setItemNode,
			handleDragOverRow,
			handleRowDrop,
			handleActivateItem,
			handleCollapseEditingPanel,
			handleDragHandleStart,
			resetDragState,
			handleTouchStart,
			handleTimelineValueChange,
			handleTimelineStartTimeCommit,
			handleTimelineDurationCommit,
			handleDeleteTextItem,
		],
	);

	return {
		sortedTextItems,
		displayItems,
		isReorderEnabled,
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
	};
}
