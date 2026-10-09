import type { DragEvent, RefObject } from 'react';
import type { ImageItem } from '../../types/video';
import {
	findInsertionIndexAtPoint,
	getInsertionIndexFromEvent,
	reorderImages,
} from './core';

type DesktopHandlersParams = {
	imageItems: ImageItem[];
	dragIndexRef: RefObject<number | null>;
	itemNodesRef: RefObject<Map<number, HTMLDivElement | null>>;
	captureItemRects: () => void;
	setDraggingId: (id: number | null) => void;
	setInsertionIndex: (idx: number | null) => void;
	onReorder?: (next: ImageItem[]) => void;
	handleDragEnd: () => void;
};

export function createDesktopHandlers({
	imageItems,
	dragIndexRef,
	itemNodesRef,
	captureItemRects,
	setDraggingId,
	setInsertionIndex,
	onReorder,
	handleDragEnd,
}: DesktopHandlersParams) {
	function onDragStart(
		e: DragEvent<HTMLButtonElement>,
		index: number,
		id: number,
	) {
		dragIndexRef.current = index;
		setDraggingId(id);
		setInsertionIndex(index);

		const tileRect = e.currentTarget.getBoundingClientRect();

		try {
			e.dataTransfer.setData('text/plain', String(id));
			e.dataTransfer.setDragImage(
				e.currentTarget,
				tileRect.width / 2,
				tileRect.height / 2,
			);
		} catch {
			// ignore
		}

		e.dataTransfer.effectAllowed = 'move';
	}

	function onDragEnd() {
		handleDragEnd();
	}

	function onDragOverItem(e: DragEvent<HTMLButtonElement>, toIndex: number) {
		e.preventDefault();
		if (dragIndexRef.current === null) return;
		setInsertionIndex(getInsertionIndexFromEvent(e, toIndex));
	}

	function onContainerDragOver(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		if (dragIndexRef.current === null) return;

		const nextIndex = findInsertionIndexAtPoint(
			imageItems,
			itemNodesRef.current,
			e.clientX,
			e.clientY,
		);
		setInsertionIndex(nextIndex);
		e.dataTransfer.dropEffect = 'move';
	}

	function onContainerDrop(e: DragEvent<HTMLDivElement>) {
		e.preventDefault();
		const fromIndex = dragIndexRef.current;
		if (fromIndex === null) {
			handleDragEnd();
			return;
		}

		const nextIndex = findInsertionIndexAtPoint(
			imageItems,
			itemNodesRef.current,
			e.clientX,
			e.clientY,
		);
		captureItemRects();
		onReorder?.(reorderImages(imageItems, fromIndex, nextIndex));
		handleDragEnd();
	}

	function onDropOnItem(e: DragEvent<HTMLButtonElement>, toIndex: number) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';

		const fromIndex = dragIndexRef.current;
		if (fromIndex === null) {
			handleDragEnd();
			return;
		}

		captureItemRects();
		const nextInsertionIndex = getInsertionIndexFromEvent(e, toIndex);
		onReorder?.(reorderImages(imageItems, fromIndex, nextInsertionIndex));
		handleDragEnd();
	}

	return {
		onDragStart,
		onDragEnd,
		onDragOverItem,
		onContainerDragOver,
		onContainerDrop,
		onDropOnItem,
	};
}
