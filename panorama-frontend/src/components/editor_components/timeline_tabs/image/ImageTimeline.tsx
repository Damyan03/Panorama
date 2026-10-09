import {
	Fragment,
	memo,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import AddImageModal from './AddImageModal';
import useVerticalAutoScroll from '../../../../hooks/useVerticalAutoScroll';
import type { ImageItem } from '../../../../types/video';
import { formatTimeMs } from '../../../../utils/formatters/time';
import {
	captureRectsByItemId,
	playFlipAnimation,
} from '../../../../utils/timeline/animations';
import { createDesktopHandlers } from '../../../../utils/timeline/desktop';
import { createMobileHandlers } from '../../../../utils/timeline/mobile';
import {
	getDisplayDurationMs,
	reorderImages,
} from '../../../../utils/timeline/core';

type ImageTimelineProps = {
	imageItems: ImageItem[];
	selectedImageId?: number | null;
	onImageSelect?: (item: ImageItem) => void;
	onReorder?: (nextImages: ImageItem[]) => void;
	onAddImage?: (file: File) => void | Promise<void>;
	onAddSolidColor?: (color: string) => void;
};

function ImageTimeline({
	imageItems,
	selectedImageId,
	onImageSelect,
	onReorder,
	onAddImage,
	onAddSolidColor,
}: ImageTimelineProps) {
	const dragIndexRef = useRef<number | null>(null);
	const touchDragIndexRef = useRef<number | null>(null);
	const touchDragIdRef = useRef<number | null>(null);
	const touchIdentifierRef = useRef<number | null>(null);
	const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
	const touchMovedRef = useRef(false);

	// DOM refs for drag hit-testing and FLIP animation.
	const itemNodesByIdRef = useRef<Map<number, HTMLDivElement | null>>(
		new Map(),
	);
	const previousRectsRef = useRef<Map<number, DOMRect> | null>(null);

	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
	const [isTouchDragging, setIsTouchDragging] = useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const autoScrollByClientY = useVerticalAutoScroll(scrollContainerRef);

	const resetDragState = useCallback(() => {
		dragIndexRef.current = null;
		touchDragIndexRef.current = null;
		touchDragIdRef.current = null;
		touchIdentifierRef.current = null;
		touchStartPointRef.current = null;
		touchMovedRef.current = false;
		setIsTouchDragging(false);
		setDraggingId(null);
		setInsertionIndex(null);
	}, []);

	const captureItemRects = useCallback(() => {
		const nodesById = itemNodesByIdRef.current;
		previousRectsRef.current = captureRectsByItemId(imageItems, (item) =>
			nodesById.get(item.id),
		);
	}, [imageItems]);

	const commitDropAtIndex = useCallback(
		(targetIndex: number) => {
			const fromIndex = dragIndexRef.current;
			if (fromIndex === null) {
				resetDragState();
				return;
			}
			captureItemRects();
			onReorder?.(reorderImages(imageItems, fromIndex, targetIndex));
			resetDragState();
		},
		[captureItemRects, imageItems, onReorder, resetDragState],
	);

	// create handler factories for desktop and mobile and bind to local refs/state
	const desktop = createDesktopHandlers({
		imageItems,
		dragIndexRef,
		itemNodesRef: itemNodesByIdRef,
		captureItemRects,
		setDraggingId,
		setInsertionIndex,
		onReorder,
		handleDragEnd: resetDragState,
	});

	const mobile = createMobileHandlers({
		imageItems,
		touchDragIndexRef,
		touchDragIdRef,
		touchIdentifierRef,
		touchStartPointRef,
		touchMovedRef,
		itemNodesRef: itemNodesByIdRef,
		captureItemRects,
		setDraggingId,
		setInsertionIndex,
		setIsTouchDragging,
		onReorder,
		handleDragEnd: resetDragState,
	});

	useLayoutEffect(() => {
		const nodesById = itemNodesByIdRef.current;
		const cleanup = playFlipAnimation(
			(id) => nodesById.get(id),
			previousRectsRef.current,
		);
		previousRectsRef.current = null;
		return cleanup;
	}, [imageItems]);

	const handleAddImageInputChange = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file || !onAddImage) {
				return;
			}

			await onAddImage(file);
			event.currentTarget.value = '';
		},
		[onAddImage],
	);

	const handleOpenAddModal = useCallback(() => {
		setIsAddModalOpen(true);
	}, []);

	const handleModalUploadClick = useCallback(() => {
		setIsAddModalOpen(false);
		fileInputRef.current?.click();
	}, []);

	if (imageItems.length === 0) {
		return (
			<>
				<div className="card flex-center p-6">
					<button
						type="button"
						onClick={handleOpenAddModal}
						className="btn btn-secondary"
					>
						Add image
					</button>
				</div>
				<AddImageModal
					open={isAddModalOpen}
					onClose={() => setIsAddModalOpen(false)}
					onAddSolidColor={onAddSolidColor}
					onUploadClick={handleModalUploadClick}
				/>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={handleAddImageInputChange}
					className="hidden"
				/>
			</>
		);
	}

	return (
		<div
			ref={scrollContainerRef}
			className="flex w-full flex-col scrollbar-thin"
		>
			<div className="relative w-full">
				<div
					className={`relative z-10 flex w-full flex-wrap items-stretch gap-3 bg-bg-secondary ${isTouchDragging ? 'touch-none select-none' : 'touch-pan-y'}`}
					onDragOver={(event) => {
						desktop.onContainerDragOver(event);
						autoScrollByClientY(event.clientY);
					}}
					onDrop={desktop.onContainerDrop}
					onTouchMove={(event) => {
						const touch = event.touches[0];
						if (touch) {
							autoScrollByClientY(touch.clientY);
						}

						mobile.onContainerTouchMove(event);
					}}
					onTouchEnd={mobile.onContainerTouchEnd}
					onTouchCancel={resetDragState}
				>
					{imageItems.map((item, index) => (
						<Fragment key={item.id}>
							{insertionIndex === index && (
								<div
									className="w-1 self-stretch rounded-full bg-primary"
									onDragOver={(e) => {
										e.preventDefault();
										setInsertionIndex(index);
										e.dataTransfer.dropEffect = 'move';
									}}
									onDrop={(e) => {
										e.preventDefault();
										commitDropAtIndex(index);
									}}
									aria-hidden="true"
								/>
							)}
							<div
								ref={(node) => {
									if (node) {
										itemNodesByIdRef.current.set(
											item.id,
											node,
										);
									} else {
										itemNodesByIdRef.current.delete(
											item.id,
										);
									}
								}}
								className="flex w-20 flex-none flex-col gap-1 will-change-transform"
							>
								<button
									type="button"
									draggable
									onClick={() => onImageSelect?.(item)}
									onDragStart={(e) =>
										desktop.onDragStart(e, index, item.id)
									}
									onTouchStart={(e) =>
										mobile.onTouchStart(e, index, item.id)
									}
									onDragEnd={desktop.onDragEnd}
									onDragOver={(e) =>
										desktop.onDragOverItem(e, index)
									}
									onDrop={(e) =>
										desktop.onDropOnItem(e, index)
									}
									className={`relative aspect-square h-20 w-full touch-none overflow-hidden rounded-md transition border hover:cursor-grab active:cursor-grabbing ${selectedImageId === item.id ? 'border-primary ring-2 ring-primary-light' : 'border-overlay-light-30'} ${draggingId === item.id ? 'opacity-60' : ''}`}
								>
									<div className="absolute left-1 top-1 z-10 rounded bg-overlay-dark-55 px-1.5 py-0.5 text-[10px] font-semibold text-text-primary">
										{index + 1}
									</div>
									{item.src === 'color' ? (
										<div
											className="h-full w-full"
											style={{
												backgroundColor: item.color,
											}}
										/>
									) : item.src ? (
										<img
											className="h-full w-full object-cover"
											src={item.src}
											alt="Timeline preview"
										/>
									) : (
										<div className="h-full w-full bg-bg-elevated" />
									)}
								</button>
								<div className="flex-center h-5 w-full truncate bg-bg-elevated text-muted px-1 text-[11px] font-medium">
									{formatTimeMs(getDisplayDurationMs(item))}
								</div>
							</div>
						</Fragment>
					))}
					{insertionIndex === imageItems.length && (
						<div
							className="w-1 self-stretch rounded-full bg-primary"
							onDragOver={(e) => {
								e.preventDefault();
								setInsertionIndex(imageItems.length);
								e.dataTransfer.dropEffect = 'move';
							}}
							onDrop={(e) => {
								e.preventDefault();
								commitDropAtIndex(imageItems.length);
							}}
							aria-hidden="true"
						/>
					)}
					<div className="flex w-20 flex-none flex-col gap-1">
						<button
							type="button"
							onClick={handleOpenAddModal}
							className="flex-center aspect-square h-20 w-full rounded-md border border-dashed border-overlay-light-30 text-3xl text-muted hover:bg-overlay-light-10"
							aria-label="Add image"
						>
							+
						</button>
						<div className="flex-center h-5 w-full truncate bg-bg-elevated text-muted px-1 text-[11px] font-medium">
							Add image
						</div>
					</div>
				</div>
			</div>
			<AddImageModal
				open={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onAddSolidColor={onAddSolidColor}
				onUploadClick={handleModalUploadClick}
			/>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleAddImageInputChange}
				className="hidden"
			/>
		</div>
	);
}

export default memo(ImageTimeline);
