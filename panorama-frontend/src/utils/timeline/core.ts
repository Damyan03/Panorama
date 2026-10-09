import type { ImageItem } from '../../types/video';

export function getDisplayDurationMs(item: ImageItem) {
	if (typeof item.duration === 'number') return Math.max(0, item.duration);
	return 0;
}

export function reorderImages<T extends { id: number }>(
	images: T[],
	fromIndex: number,
	insertionIndex: number,
) {
	if (fromIndex < 0 || fromIndex >= images.length) return images;

	const nextImages = [...images];
	const [movedImage] = nextImages.splice(fromIndex, 1);

	const nextIndex =
		fromIndex < insertionIndex ? insertionIndex - 1 : insertionIndex;
	nextImages.splice(nextIndex, 0, movedImage);

	return nextImages;
}

export function getInsertionIndexFromEvent(
	event: { clientX: number; currentTarget: EventTarget | null },
	targetIndex: number,
) {
	const currentTarget = event.currentTarget as HTMLElement | null;
	if (!currentTarget) return targetIndex;
	const rect = currentTarget.getBoundingClientRect();
	return event.clientX < rect.left + rect.width / 2
		? targetIndex
		: targetIndex + 1;
}

type PositionedItem = { index: number; rect: DOMRect };

function computePositionedItems(
	imageItems: ImageItem[],
	itemNodes: Map<number, HTMLDivElement | null>,
): PositionedItem[] {
	const positioned: PositionedItem[] = [];
	imageItems.forEach((item, index) => {
		const node = itemNodes.get(item.id);
		if (!node) return;
		positioned.push({ index, rect: node.getBoundingClientRect() });
	});
	return positioned;
}

type Row = { items: PositionedItem[]; top: number; bottom: number };

function groupIntoRows(
	positionedItems: PositionedItem[],
	rowTolerance = 10,
): Row[] {
	if (positionedItems.length === 0) return [];

	positionedItems.sort((a, b) =>
		a.rect.top !== b.rect.top
			? a.rect.top - b.rect.top
			: a.rect.left - b.rect.left,
	);

	const rows: Row[] = [];
	positionedItems.forEach((entry) => {
		const row = rows.find(
			(candidate) =>
				Math.abs(candidate.top - entry.rect.top) <= rowTolerance,
		);
		if (!row) {
			rows.push({
				items: [entry],
				top: entry.rect.top,
				bottom: entry.rect.bottom,
			});
			return;
		}
		row.items.push(entry);
		row.top = Math.min(row.top, entry.rect.top);
		row.bottom = Math.max(row.bottom, entry.rect.bottom);
	});

	rows.forEach((row) => row.items.sort((a, b) => a.rect.left - b.rect.left));
	return rows;
}

export function findInsertionIndexAtPoint(
	imageItems: ImageItem[],
	itemNodes: Map<number, HTMLDivElement | null>,
	x: number,
	y: number,
) {
	const positionedItems = computePositionedItems(imageItems, itemNodes);
	if (positionedItems.length === 0) return imageItems.length;

	const rows = groupIntoRows(positionedItems);

	const rowContainingPointer = rows.find(
		(row) => y >= row.top && y <= row.bottom,
	);
	const targetRow =
		rowContainingPointer ??
		rows.reduce((closest, row) => {
			const distanceToClosest =
				y < closest.top
					? closest.top - y
					: y > closest.bottom
						? y - closest.bottom
						: 0;
			const distanceToRow =
				y < row.top ? row.top - y : y > row.bottom ? y - row.bottom : 0;
			return distanceToRow < distanceToClosest ? row : closest;
		});

	for (let i = 0; i < targetRow.items.length; i++) {
		const mid =
			targetRow.items[i].rect.left + targetRow.items[i].rect.width / 2;
		if (x < mid) return targetRow.items[i].index;
	}

	return targetRow.items[targetRow.items.length - 1].index + 1;
}

export function recalculateSequentialTimings<
	T extends { startTime: number; endTime?: number },
>(items: T[], getDurationMs: (item: T) => number): T[] {
	let currentStartTime = 0;

	return items.map((item) => {
		const durationMs = Math.max(0, getDurationMs(item));
		const startTime = currentStartTime;
		currentStartTime += durationMs;

		return {
			...item,
			startTime,
			endTime:
				typeof item.endTime === 'number'
					? startTime + durationMs
					: item.endTime,
		};
	});
}

export function recalculateImagesAfterReorder(
	images: ImageItem[],
): ImageItem[] {
	// Preserve the existing slot start times (which may include intentional
	// overlaps for crossfade) and just permute images into them.
	const slotStartTimes = images
		.map((image) => image.startTime)
		.sort((a, b) => a - b);

	return images.map((image, index) => {
		const { endTime: _endTime, ...rest } = image;
		void _endTime;
		return { ...rest, startTime: slotStartTimes[index] };
	});
}

export function isSameOrderById<T extends { id: number }>(
	itemsA: T[],
	itemsB: T[],
) {
	if (itemsA.length !== itemsB.length) {
		return false;
	}

	for (let index = 0; index < itemsA.length; index += 1) {
		if (itemsA[index].id !== itemsB[index].id) {
			return false;
		}
	}

	return true;
}
