import { useEffect, useRef } from 'react';
import type { MouseEventHandler, PointerEventHandler } from 'react';

type DragState = {
	isDragging: boolean;
	pointerId: number | null;
	startX: number;
	startScrollLeft: number;
	didDrag: boolean;
	suppressClick: boolean;
	resetSuppressClickTimer: number | null;
};

type DragScrollHandlers = {
	onPointerDown: PointerEventHandler<HTMLDivElement>;
	onPointerMove: PointerEventHandler<HTMLDivElement>;
	onPointerUp: PointerEventHandler<HTMLDivElement>;
	onPointerCancel: PointerEventHandler<HTMLDivElement>;
	onClickCapture: MouseEventHandler<HTMLDivElement>;
};

const DESKTOP_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const DRAG_THRESHOLD_PX = 4;

function canDragScroll(pointerType: string): boolean {
	return (
		pointerType === 'mouse' &&
		typeof window !== 'undefined' &&
		window.matchMedia(DESKTOP_POINTER_QUERY).matches
	);
}

export default function useDesktopDragScroll(): DragScrollHandlers {
	const stateRef = useRef<DragState>({
		isDragging: false,
		pointerId: null,
		startX: 0,
		startScrollLeft: 0,
		didDrag: false,
		suppressClick: false,
		resetSuppressClickTimer: null,
	});

	useEffect(() => {
		return () => {
			const timer = stateRef.current.resetSuppressClickTimer;
			if (timer != null) {
				window.clearTimeout(timer);
			}
		};
	}, []);

	const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
		if (event.button !== 0 || !canDragScroll(event.pointerType)) {
			return;
		}

		const element = event.currentTarget;
		element.setPointerCapture(event.pointerId);

		const state = stateRef.current;
		state.isDragging = true;
		state.pointerId = event.pointerId;
		state.startX = event.clientX;
		state.startScrollLeft = element.scrollLeft;
		state.didDrag = false;
		state.suppressClick = false;

		if (state.resetSuppressClickTimer != null) {
			window.clearTimeout(state.resetSuppressClickTimer);
			state.resetSuppressClickTimer = null;
		}
	};

	const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
		const state = stateRef.current;
		if (!state.isDragging || state.pointerId !== event.pointerId) {
			return;
		}

		const deltaX = event.clientX - state.startX;
		if (Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
			state.didDrag = true;
		}

		if (!state.didDrag) {
			return;
		}

		event.preventDefault();
		event.currentTarget.scrollLeft = state.startScrollLeft - deltaX;
	};

	const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
		const state = stateRef.current;
		if (!state.isDragging || state.pointerId !== event.pointerId) {
			return;
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		state.isDragging = false;
		state.pointerId = null;

		if (state.didDrag) {
			state.suppressClick = true;
			state.resetSuppressClickTimer = window.setTimeout(() => {
				stateRef.current.suppressClick = false;
				stateRef.current.resetSuppressClickTimer = null;
			}, 0);
		}
	};

	const onPointerCancel: PointerEventHandler<HTMLDivElement> = (event) => {
		const state = stateRef.current;
		if (!state.isDragging || state.pointerId !== event.pointerId) {
			return;
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		state.isDragging = false;
		state.pointerId = null;
		state.didDrag = false;
		state.suppressClick = false;
	};

	const onClickCapture: MouseEventHandler<HTMLDivElement> = (event) => {
		if (!stateRef.current.suppressClick) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		stateRef.current.suppressClick = false;
	};

	return {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onPointerCancel,
		onClickCapture,
	};
}
