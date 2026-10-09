import type { TouchEvent, RefObject } from 'react';
import type { ImageItem } from '../../types/video';
import { findInsertionIndexAtPoint, reorderImages } from './core';

type MobileHandlersParams = {
	imageItems: ImageItem[];
	touchDragIndexRef: RefObject<number | null>;
	touchDragIdRef: RefObject<number | null>;
	touchIdentifierRef: RefObject<number | null>;
	touchStartPointRef: RefObject<{ x: number; y: number } | null>;
	touchMovedRef: RefObject<boolean>;
	itemNodesRef: RefObject<Map<number, HTMLDivElement | null>>;
	captureItemRects: () => void;
	setDraggingId: (id: number | null) => void;
	setInsertionIndex: (idx: number | null) => void;
	setIsTouchDragging: (v: boolean) => void;
	onReorder?: (next: ImageItem[]) => void;
	handleDragEnd: () => void;
};

export function createMobileHandlers({
	imageItems,
	touchDragIndexRef,
	touchDragIdRef,
	touchIdentifierRef,
	touchStartPointRef,
	touchMovedRef,
	itemNodesRef,
	captureItemRects,
	setDraggingId,
	setInsertionIndex,
	setIsTouchDragging,
	onReorder,
	handleDragEnd,
}: MobileHandlersParams) {
	function onTouchStart(
		e: TouchEvent<HTMLButtonElement>,
		index: number,
		id: number,
	) {
		if (e.touches.length === 0) return;
		const touch = e.touches[0];
		touchDragIndexRef.current = index;
		touchDragIdRef.current = id;
		touchIdentifierRef.current = touch.identifier;
		touchStartPointRef.current = { x: touch.clientX, y: touch.clientY };
		touchMovedRef.current = false;

		setDraggingId(id);
		setInsertionIndex(index);
		setIsTouchDragging(true);
	}

	function onContainerTouchMove(e: TouchEvent<HTMLDivElement>) {
		const fromIndex = touchDragIndexRef.current;
		const trackedTouchIdentifier = touchIdentifierRef.current;
		if (fromIndex === null || trackedTouchIdentifier === null) return;

		const touch = Array.from(e.touches).find(
			(item) => item.identifier === trackedTouchIdentifier,
		);
		if (!touch) return;

		const startPoint = touchStartPointRef.current;
		if (startPoint) {
			const dx = Math.abs(touch.clientX - startPoint.x);
			const dy = Math.abs(touch.clientY - startPoint.y);
			if (dx > 6 || dy > 6) touchMovedRef.current = true;
		}

		if (!touchMovedRef.current) return;

		setInsertionIndex(
			findInsertionIndexAtPoint(
				imageItems,
				itemNodesRef.current,
				touch.clientX,
				touch.clientY,
			),
		);
	}

	function onContainerTouchEnd(e: TouchEvent<HTMLDivElement>) {
		const fromIndex = touchDragIndexRef.current;
		const trackedTouchIdentifier = touchIdentifierRef.current;
		if (fromIndex === null || trackedTouchIdentifier === null) return;

		const changedTouch = Array.from(e.changedTouches).find(
			(item) => item.identifier === trackedTouchIdentifier,
		);
		if (!changedTouch) return;

		if (touchMovedRef.current) {
			if (e.cancelable) e.preventDefault();
			const nextIndex = findInsertionIndexAtPoint(
				imageItems,
				itemNodesRef.current,
				changedTouch.clientX,
				changedTouch.clientY,
			);
			captureItemRects();
			onReorder?.(reorderImages(imageItems, fromIndex, nextIndex));
		}

		handleDragEnd();
	}

	return {
		onTouchStart,
		onContainerTouchMove,
		onContainerTouchEnd,
	};
}
