import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDebouncedCallback from '../../../../hooks/useDebouncedCallback';
import useElementSize from '../../../../hooks/useElementSize';
import type { ImageItem } from '../../../../types/video';
import { clampPercent, clampScalePercent } from '../../../../utils/math/clamp';
import { calculateImageTransform } from '../../../../utils/images/positioning';
import { SliderInput } from '../../../ui/inputs';

type EditorImagePreviewProps = {
	image?: ImageItem;
	scaleOverride?: number;
	onPositionChange?: (position: { left: number; top: number }) => void;
};

type PositionState = {
	left: number;
	top: number;
};

const XSlider = memo(function XSlider({
	value,
	onChange,
	onCommit,
}: {
	value: number;
	onChange: (value: number) => void;
	onCommit: () => void;
}) {
	return (
		<SliderInput
			value={value}
			onChange={onChange}
			onCommit={onCommit}
			ariaLabel="Image horizontal position"
			hideNumber
		/>
	);
});

const YSlider = memo(function YSlider({
	value,
	onChange,
	onCommit,
}: {
	value: number;
	onChange: (value: number) => void;
	onCommit: () => void;
}) {
	return (
		<SliderInput
			value={value}
			onChange={onChange}
			onCommit={onCommit}
			ariaLabel="Image vertical position"
			vertical
			hideNumber
		/>
	);
});
function EditorImagePreview({
	image,
	scaleOverride,
	onPositionChange,
}: EditorImagePreviewProps) {
	const src = image?.src?.trim() || null;
	const isColorImage = src === 'color';
	const scalePercent = clampScalePercent(
		scaleOverride ?? image?.scale ?? 100,
	);
	const [draftPosition, setDraftPosition] = useState<PositionState>({
		left: clampPercent(image?.position.left ?? 50),
		top: clampPercent(image?.position.top ?? 50),
	});
	const draftRef = useRef<PositionState>(draftPosition);
	const [visibleOffsetX, setVisibleOffsetX] = useState(0);
	const [visibleOffsetY, setVisibleOffsetY] = useState(0);
	const previewContainerRef = useRef<HTMLDivElement | null>(null);
	const visibleViewportRef = useRef<HTMLDivElement | null>(null);
	const previewImageRef = useRef<HTMLImageElement | null>(null);
	const previewContainerSize = useElementSize(previewContainerRef);
	const visibleViewportSize = useElementSize(visibleViewportRef);
	const previewImageSize = useElementSize(previewImageRef);

	const onPositionChangeStable = useCallback(
		(position: PositionState) => {
			onPositionChange?.(position);
		},
		[onPositionChange],
	);

	const { call: debouncedCommit, cancel: cancelDebouncedCommit } =
		useDebouncedCallback(onPositionChangeStable, 300);

	const updatePreviewBounds = useCallback(() => {
		const previewContainer = previewContainerRef.current;
		const visibleViewport = visibleViewportRef.current;

		if (!previewContainer || !visibleViewport) return;

		const previewContainerRect =
			previewContainerSize || previewContainer.getBoundingClientRect();
		const visibleViewportRect =
			visibleViewportSize || visibleViewport.getBoundingClientRect();

		const nextVisibleOffsetX =
			visibleViewportRect.left - previewContainerRect.left;
		const nextVisibleOffsetY =
			visibleViewportRect.top - previewContainerRect.top;

		setVisibleOffsetX(nextVisibleOffsetX);
		setVisibleOffsetY(nextVisibleOffsetY);
	}, [previewContainerSize, visibleViewportSize]);

	useEffect(() => {
		cancelDebouncedCommit();

		const initial = {
			left: clampPercent(image?.position.left ?? 50),
			top: clampPercent(image?.position.top ?? 50),
		};
		setDraftPosition(initial);
		draftRef.current = initial;
	}, [cancelDebouncedCommit, image?.id]);

	useEffect(() => {
		const rafId = window.requestAnimationFrame(() => {
			updatePreviewBounds();
		});

		return () => {
			window.cancelAnimationFrame(rafId);
		};
	}, [
		previewContainerSize,
		visibleViewportSize,
		previewImageSize,
		src,
		updatePreviewBounds,
	]);

	const displayTransform = useMemo(() => {
		return calculateImageTransform(
			draftPosition,
			{
				width: visibleViewportSize?.width ?? 0,
				height: visibleViewportSize?.height ?? 0,
			},
			{
				width: previewImageSize?.width ?? 0,
				height: previewImageSize?.height ?? 0,
			},
			{ left: visibleOffsetX, top: visibleOffsetY },
		);
	}, [
		draftPosition,
		previewImageSize?.height,
		previewImageSize?.width,
		visibleOffsetX,
		visibleOffsetY,
		visibleViewportSize?.height,
		visibleViewportSize?.width,
	]);

	const handleXChange = useCallback(
		(nextValue: number) => {
			const clampedValue = clampPercent(nextValue);
			if (clampedValue === draftRef.current.left) {
				return;
			}

			const nextPosition = { ...draftRef.current, left: clampedValue };

			draftRef.current = nextPosition;
			setDraftPosition(nextPosition);
			debouncedCommit(nextPosition);
		},
		[debouncedCommit],
	);

	const handleYChange = useCallback(
		(nextValue: number) => {
			const clampedValue = clampPercent(nextValue);
			if (clampedValue === draftRef.current.top) {
				return;
			}

			const nextPosition = { ...draftRef.current, top: clampedValue };

			draftRef.current = nextPosition;
			setDraftPosition(nextPosition);
			debouncedCommit(nextPosition);
		},
		[debouncedCommit],
	);

	const handleCommit = useCallback(() => {
		cancelDebouncedCommit();
		onPositionChange?.(draftRef.current);
	}, [cancelDebouncedCommit, onPositionChange]);

	return (
		<div className="flex">
			<div className="flex flex-col">
				<div className="flex-center relative h-50 aspect-square overflow-hidden">
					<div
						ref={previewContainerRef}
						className="absolute inset-0 bg-bg-elevated overflow-hidden"
					>
						{isColorImage ? (
							<div
								className="absolute inset-0"
								style={{ backgroundColor: image?.color }}
							/>
						) : src ? (
							<img
								ref={previewImageRef}
								className="absolute left-0 top-0 h-auto max-w-none will-change-transform"
								style={{
									width: `${scalePercent}%`,
									transform: `translate(${displayTransform.translateX}px, ${displayTransform.translateY}px)`,
								}}
								onLoad={updatePreviewBounds}
								src={src}
								alt="Editor preview"
							/>
						) : null}
					</div>
					<div className="absolute inset-0 z-10 flex flex-col">
						<div className="flex-1 bg-overlay-dark-50" />
						<div
							ref={visibleViewportRef}
							className="border border-border aspect-video w-full shrink-0"
						/>
						<div className="flex-1 bg-overlay-dark-50" />
					</div>
				</div>
				<XSlider
					value={draftPosition.left}
					onChange={handleXChange}
					onCommit={handleCommit}
				/>
			</div>
			<div className="mb-5">
				<YSlider
					value={draftPosition.top}
					onChange={handleYChange}
					onCommit={handleCommit}
				/>
			</div>
		</div>
	);
}

export default memo(EditorImagePreview, (prev, next) => {
	const prevId = prev.image?.id ?? null;
	const nextId = next.image?.id ?? null;

	return prevId === nextId && prev.scaleOverride === next.scaleOverride;
});
