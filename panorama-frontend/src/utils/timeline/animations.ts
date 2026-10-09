type GetNode = (itemId: number) => HTMLElement | null | undefined;

export function captureRectsByItemId<T extends { id: number }>(
	items: T[],
	getNode: (item: T) => HTMLElement | null | undefined,
): Map<number, DOMRect> {
	const rects = new Map<number, DOMRect>();

	items.forEach((item) => {
		const node = getNode(item);
		if (node) {
			rects.set(item.id, node.getBoundingClientRect());
		}
	});

	return rects;
}

type FlipNode = { node: HTMLElement; deltaX: number; deltaY: number };

const FLIP_TRANSITION = 'transform 220ms cubic-bezier(.2,.8,.2,1)';
const FLIP_CLEANUP_MS = 260;

export function playFlipAnimation(
	getNodeByItemId: GetNode,
	previousRects: Map<number, DOMRect> | null,
) {
	if (!previousRects) {
		return;
	}

	const animatedNodes: FlipNode[] = [];

	previousRects.forEach((previousRect, itemId) => {
		const node = getNodeByItemId(itemId);
		if (!node) {
			return;
		}

		const nextRect = node.getBoundingClientRect();
		const deltaX = previousRect.left - nextRect.left;
		const deltaY = previousRect.top - nextRect.top;

		if (deltaX !== 0 || deltaY !== 0) {
			animatedNodes.push({ node, deltaX, deltaY });
		}
	});

	if (animatedNodes.length === 0) {
		return;
	}

	animatedNodes.forEach(({ node, deltaX, deltaY }) => {
		node.style.transition = 'none';
		node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
	});

	const rafId = window.requestAnimationFrame(() => {
		animatedNodes.forEach(({ node }) => {
			node.style.transition = FLIP_TRANSITION;
			node.style.transform = '';
		});
	});

	const clearInlineStyles = () => {
		animatedNodes.forEach(({ node }) => {
			node.style.transition = '';
			node.style.transform = '';
		});
	};

	const timeoutId = window.setTimeout(clearInlineStyles, FLIP_CLEANUP_MS);

	return () => {
		window.cancelAnimationFrame(rafId);
		window.clearTimeout(timeoutId);
		clearInlineStyles();
	};
}
