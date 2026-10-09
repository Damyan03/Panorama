import {
	memo,
	useCallback,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type PointerEvent,
} from 'react';
import {
	getAnimationStateAtTime,
	type AnimationConfig,
} from '../../utils/animations/text';
import {
	formatPositionStyle,
	type Position,
} from '../../utils/formatters/position';
import {
	clamp,
	clampScalePercent,
	clampWidthPercent,
	toClampedPercent,
} from '../../utils/math/clamp';
import { EDITOR_TEXT_DEFAULT_WIDTH_PERCENT } from '../../constants/ui';
import type { TextStyle } from '../../types/video';
import { normalizeTextStyle } from '../../utils/editor/textStyle';

type NumericPosition = {
	left: number;
	top: number;
};

type PointerDragMode = 'move' | 'scale' | 'width';

type TextPointerDragState = {
	pointerId: number;
	mode: PointerDragMode;
	scaleDirection: 1 | -1;
	startClientX: number;
	startClientY: number;
	startLeft: number;
	startTop: number;
	startScale: number;
	startWidth: number;
	lastLeft: number;
	lastTop: number;
	lastScale: number;
	lastWidth: number;
	stageWidth: number;
	stageHeight: number;
};

const SCALE_DRAG_SENSITIVITY = 0.5;
const TEXT_FONT_SIZE_PX = 24;
const TEXT_BASE_FONT_WEIGHT = 500;
const TEXT_BOLD_FONT_WEIGHT = 700;
const EDGE_SMOOTHING_PX = 1;
const MIN_TEXT_LEFT_PERCENT = -100;
const MAX_TEXT_LEFT_PERCENT = 100;
const MIN_TEXT_TOP_PERCENT = 0;
const MAX_TEXT_TOP_PERCENT = 100;
const EDGE_RING_RADIUS_STEP_PX = 1.5;
const EDGE_MIN_DIRECTION_SAMPLES = 12;
const EDGE_MAX_DIRECTION_SAMPLES = 24;
const EDGE_SHADOW_CACHE_LIMIT = 240;
const edgeShadowCache = new Map<string, string>();

function getEdgeDirectionSampleCount(radius: number) {
	const scaled = Math.round(8 + radius * 2);

	return Math.max(
		EDGE_MIN_DIRECTION_SAMPLES,
		Math.min(EDGE_MAX_DIRECTION_SAMPLES, scaled),
	);
}

function buildEdgeTextShadow(
	edgeWidthPx: number,
	edgeColor: string,
	edgeSmoothingPx: number,
) {
	const clampedWidth = Math.max(0, Number(edgeWidthPx.toFixed(2)));
	const clampedSmoothing = Math.max(0, Number(edgeSmoothingPx.toFixed(2)));

	if (clampedWidth <= 0) {
		return undefined;
	}

	const cacheKey = `${clampedWidth}|${clampedSmoothing}|${edgeColor}`;
	const cachedShadow = edgeShadowCache.get(cacheKey);
	if (cachedShadow) {
		return cachedShadow;
	}

	const ringCount = Math.max(
		1,
		Math.ceil(clampedWidth / EDGE_RING_RADIUS_STEP_PX),
	);
	const ringStep = clampedWidth / ringCount;
	const shadows: string[] = [];

	for (let ring = 1; ring <= ringCount; ring += 1) {
		const radius = Number((ringStep * ring).toFixed(2));
		const directionSamples = getEdgeDirectionSampleCount(radius);

		for (let sample = 0; sample < directionSamples; sample += 1) {
			const angle = (sample / directionSamples) * Math.PI * 2;
			const offsetX = Number((Math.cos(angle) * radius).toFixed(2));
			const offsetY = Number((Math.sin(angle) * radius).toFixed(2));

			shadows.push(
				`${offsetX}px ${offsetY}px ${clampedSmoothing}px ${edgeColor}`,
			);
		}
	}

	const shadowValue = shadows.join(', ');

	if (edgeShadowCache.size >= EDGE_SHADOW_CACHE_LIMIT) {
		edgeShadowCache.clear();
	}
	edgeShadowCache.set(cacheKey, shadowValue);

	return shadowValue;
}

function VideoText({
	value,
	position,
	scale = 100,
	width = EDITOR_TEXT_DEFAULT_WIDTH_PERCENT,
	textStyle,
	animation,
	elapsedMs,
	startTime,
	editable = false,
	onPreviewPositionChange,
	onPositionChange,
	onScalePreviewChange,
	onScaleChange,
	onWidthPreviewChange,
	onWidthChange,
}: {
	value: string;
	position: Position;
	scale?: number;
	width?: number;
	textStyle?: TextStyle;
	animation?: AnimationConfig[];
	elapsedMs: number;
	startTime: number;
	editable?: boolean;
	onPreviewPositionChange?: (position: NumericPosition) => void;
	onPositionChange?: (position: NumericPosition) => void;
	onScalePreviewChange?: (scale: number) => void;
	onScaleChange?: (scale: number) => void;
	onWidthChange?: (width: number) => void;
	onWidthPreviewChange?: (width: number) => void;
}) {
	const elapsedSinceStart = elapsedMs - startTime;
	const { styles: animationStyles, positionDelta } = getAnimationStateAtTime(
		animation,
		elapsedSinceStart,
	);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dragStateRef = useRef<TextPointerDragState | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const isTyping = useMemo(
		() => animation?.some((a) => a.type === 'typing') ?? false,
		[animation],
	);
	const normalizedPosition = useMemo(
		() => ({
			left: toClampedPercent(
				position.left,
				50,
				MIN_TEXT_LEFT_PERCENT,
				MAX_TEXT_LEFT_PERCENT,
			),
			top: toClampedPercent(
				position.top,
				50,
				MIN_TEXT_TOP_PERCENT,
				MAX_TEXT_TOP_PERCENT,
			),
		}),
		[position.left, position.top],
	);
	const previewPositionChangeHandler =
		onPreviewPositionChange ?? onPositionChange;
	const canMoveText =
		editable && typeof previewPositionChangeHandler === 'function';
	const canScaleText =
		editable &&
		(typeof onScalePreviewChange === 'function' ||
			typeof onScaleChange === 'function');
	const previewWidthChangeHandler = onWidthPreviewChange ?? onWidthChange;
	const canResizeWidth =
		editable && typeof previewWidthChangeHandler === 'function';
	const widthResizeAnchorFactor = isTyping ? 0 : 0.5;
	const previewScaleChangeHandler = onScalePreviewChange ?? onScaleChange;
	const resolvedTextStyle = useMemo(
		() => normalizeTextStyle(textStyle),
		[textStyle],
	);

	const clearPointerDrag = useCallback(() => {
		dragStateRef.current = null;
		setIsDragging(false);
	}, []);

	const beginPointerDrag = useCallback(
		(
			event: PointerEvent<HTMLElement>,
			mode: PointerDragMode,
			scaleDirection: 1 | -1 = 1,
		) => {
			if (
				(mode === 'move' && !canMoveText) ||
				(mode === 'scale' && !canScaleText) ||
				(mode === 'width' && !canResizeWidth)
			) {
				return;
			}

			const containerNode = containerRef.current;
			const stageNode = containerNode?.parentElement;
			if (!containerNode || !stageNode) {
				return;
			}

			const stageRect = stageNode.getBoundingClientRect();
			if (stageRect.width <= 0 || stageRect.height <= 0) {
				return;
			}

			if (event.cancelable) {
				event.preventDefault();
			}
			event.stopPropagation();

			containerNode.setPointerCapture(event.pointerId);
			const startLeft = normalizedPosition.left;
			const startTop = normalizedPosition.top;
			const startScale = clampScalePercent(scale);
			const startWidth = clampWidthPercent(width);
			dragStateRef.current = {
				pointerId: event.pointerId,
				mode,
				scaleDirection,
				startClientX: event.clientX,
				startClientY: event.clientY,
				startLeft,
				startTop,
				startScale,
				startWidth,
				lastLeft: startLeft,
				lastTop: startTop,
				lastScale: startScale,
				lastWidth: startWidth,
				stageWidth: stageRect.width,
				stageHeight: stageRect.height,
			};
			setIsDragging(true);
		},
		[
			canMoveText,
			canScaleText,
			canResizeWidth,
			normalizedPosition.left,
			normalizedPosition.top,
			scale,
			width,
		],
	);

	const handlePointerMove = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const dragState = dragStateRef.current;
			if (!dragState || event.pointerId !== dragState.pointerId) {
				return;
			}

			if (event.cancelable) {
				event.preventDefault();
			}

			if (dragState.mode === 'move' && previewPositionChangeHandler) {
				const deltaLeftPercent =
					((event.clientX - dragState.startClientX) /
						dragState.stageWidth) *
					100;
				const deltaTopPercent =
					((event.clientY - dragState.startClientY) /
						dragState.stageHeight) *
					100;
				const nextLeft = clamp(
					dragState.startLeft + deltaLeftPercent,
					MIN_TEXT_LEFT_PERCENT,
					MAX_TEXT_LEFT_PERCENT,
				);
				const nextTop = clamp(
					dragState.startTop + deltaTopPercent,
					MIN_TEXT_TOP_PERCENT,
					MAX_TEXT_TOP_PERCENT,
				);

				if (
					nextLeft === dragState.lastLeft &&
					nextTop === dragState.lastTop
				) {
					return;
				}

				dragState.lastLeft = nextLeft;
				dragState.lastTop = nextTop;

				previewPositionChangeHandler({
					left: nextLeft,
					top: nextTop,
				});
				return;
			}

			if (dragState.mode === 'width' && previewWidthChangeHandler) {
				const scaleFactor = Math.max(dragState.startScale / 100, 0.01);
				const deltaWidthPercent =
					(((event.clientX - dragState.startClientX) /
						dragState.stageWidth) *
						100) /
					scaleFactor;
				const nextWidth = Number(
					clampWidthPercent(
						dragState.startWidth + deltaWidthPercent,
					).toFixed(2),
				);

				if (nextWidth !== dragState.lastWidth) {
					dragState.lastWidth = nextWidth;
					previewWidthChangeHandler(nextWidth);
				}

				if (
					previewPositionChangeHandler &&
					widthResizeAnchorFactor !== 0
				) {
					const anchorShiftPercent =
						(nextWidth - dragState.startWidth) *
						widthResizeAnchorFactor;
					const nextLeft = clamp(
						dragState.startLeft + anchorShiftPercent,
						MIN_TEXT_LEFT_PERCENT,
						MAX_TEXT_LEFT_PERCENT,
					);
					const nextTop = dragState.startTop;

					if (
						nextLeft !== dragState.lastLeft ||
						nextTop !== dragState.lastTop
					) {
						dragState.lastLeft = nextLeft;
						dragState.lastTop = nextTop;

						previewPositionChangeHandler({
							left: nextLeft,
							top: nextTop,
						});
					}
				}
				return;
			}

			if (dragState.mode === 'scale' && previewScaleChangeHandler) {
				const deltaX = event.clientX - dragState.startClientX;
				const deltaY = event.clientY - dragState.startClientY;
				const delta = (deltaX + deltaY) / 2;
				const nextScale = Math.round(
					clampScalePercent(
						dragState.startScale +
							delta *
								dragState.scaleDirection *
								SCALE_DRAG_SENSITIVITY,
					),
				);

				if (nextScale === dragState.lastScale) {
					return;
				}

				dragState.lastScale = nextScale;
				previewScaleChangeHandler(nextScale);
			}
		},
		[
			onPositionChange,
			onWidthChange,
			onWidthPreviewChange,
			previewPositionChangeHandler,
			previewScaleChangeHandler,
			previewWidthChangeHandler,
			widthResizeAnchorFactor,
		],
	);

	const handlePointerUp = useCallback(
		(event: PointerEvent<HTMLDivElement>) => {
			const dragState = dragStateRef.current;
			if (!dragState || event.pointerId !== dragState.pointerId) {
				return;
			}

			const containerNode = containerRef.current;
			if (containerNode?.hasPointerCapture(event.pointerId)) {
				containerNode.releasePointerCapture(event.pointerId);
			}

			if (
				dragState.mode === 'move' &&
				typeof onPreviewPositionChange === 'function' &&
				typeof onPositionChange === 'function'
			) {
				onPositionChange({
					left: dragState.lastLeft,
					top: dragState.lastTop,
				});
			}

			if (
				dragState.mode === 'width' &&
				typeof onWidthPreviewChange === 'function' &&
				typeof onWidthChange === 'function'
			) {
				onWidthChange(dragState.lastWidth);
			}

			if (
				dragState.mode === 'width' &&
				typeof onPreviewPositionChange === 'function' &&
				typeof onPositionChange === 'function' &&
				widthResizeAnchorFactor !== 0
			) {
				onPositionChange({
					left: dragState.lastLeft,
					top: dragState.lastTop,
				});
			}

			if (
				dragState.mode === 'scale' &&
				typeof onScalePreviewChange === 'function' &&
				typeof onScaleChange === 'function' &&
				dragState.lastScale !== dragState.startScale
			) {
				onScaleChange(dragState.lastScale);
			}

			clearPointerDrag();
		},
		[
			clearPointerDrag,
			onPositionChange,
			onPreviewPositionChange,
			onScaleChange,
			onScalePreviewChange,
			onWidthChange,
			onWidthPreviewChange,
			widthResizeAnchorFactor,
		],
	);

	const containerClass = isTyping
		? 'absolute z-10 items-center -translate-y-1/2'
		: 'center absolute z-10 -translate-x-1/2 -translate-y-1/2';

	const positionStyle = formatPositionStyle(position);
	const clampedScale = clampScalePercent(scale);
	const clampedWidth = clampWidthPercent(width);
	const scaleFactor = clampedScale / 100;
	const moveLeft = positionDelta?.left ?? 0;
	const moveTop = positionDelta?.top ?? 0;
	const left =
		moveLeft !== 0
			? `calc(${positionStyle.left} + ${moveLeft}%)`
			: positionStyle.left;
	const top =
		moveTop !== 0
			? `calc(${positionStyle.top} + ${moveTop}%)`
			: positionStyle.top;
	const computedFontWeight = resolvedTextStyle.bold
		? TEXT_BOLD_FONT_WEIGHT
		: TEXT_BASE_FONT_WEIGHT;
	const textDecorationLine = [
		resolvedTextStyle.underline ? 'underline' : '',
		resolvedTextStyle.lineThrough ? 'line-through' : '',
	]
		.filter(Boolean)
		.join(' ');
	const dropShadowValue = resolvedTextStyle.dropShadowEnabled
		? `${resolvedTextStyle.dropShadowOffsetXPx}px ${resolvedTextStyle.dropShadowOffsetYPx}px ${resolvedTextStyle.dropShadowBlurPx}px ${resolvedTextStyle.dropShadowColor}`
		: undefined;
	const edgeShadowValue = useMemo(() => {
		if (!resolvedTextStyle.edgeEnabled) {
			return undefined;
		}

		return buildEdgeTextShadow(
			resolvedTextStyle.edgeWidthPx,
			resolvedTextStyle.edgeColor,
			EDGE_SMOOTHING_PX,
		);
	}, [
		resolvedTextStyle.edgeColor,
		resolvedTextStyle.edgeEnabled,
		resolvedTextStyle.edgeWidthPx,
	]);
	const combinedTextShadow = [edgeShadowValue, dropShadowValue]
		.filter((value): value is string => Boolean(value))
		.join(', ');
	const animationOpacity =
		typeof animationStyles.opacity === 'number'
			? animationStyles.opacity
			: typeof animationStyles.opacity === 'string'
				? Number.parseFloat(animationStyles.opacity)
				: undefined;
	const baseOpacity = resolvedTextStyle.opacity / 100;
	const combinedOpacity = Number.isFinite(animationOpacity)
		? baseOpacity * (animationOpacity ?? 1)
		: baseOpacity;
	const textBaseStyles: CSSProperties = {
		...animationStyles,
		color: resolvedTextStyle.color,
		fontFamily: resolvedTextStyle.fontFamily,
		fontSize: `${TEXT_FONT_SIZE_PX}px`,
		fontWeight: computedFontWeight,
		fontStyle: resolvedTextStyle.italic ? 'italic' : 'normal',
		textAlign: resolvedTextStyle.textAlign,
		textDecorationLine: textDecorationLine || undefined,
		letterSpacing: `${resolvedTextStyle.letterSpacingPx}px`,
		lineHeight: resolvedTextStyle.lineHeight,
		opacity: combinedOpacity,
		textShadow: combinedTextShadow || undefined,
		transform:
			typeof animationStyles.transform === 'string'
				? animationStyles.transform
				: undefined,
		transformOrigin: editable ? 'top left' : 'center center',
		overflowWrap: 'anywhere',
	};

	return (
		<div
			ref={containerRef}
			className={`flex ${containerClass}`}
			style={{
				left,
				top,
				width: `${clampedWidth}%`,
			}}
			onPointerMove={editable ? handlePointerMove : undefined}
			onPointerUp={editable ? handlePointerUp : undefined}
			onPointerCancel={editable ? handlePointerUp : undefined}
			onLostPointerCapture={editable ? clearPointerDrag : undefined}
		>
			<div
				className={`relative inline-flex w-full min-w-0 items-center ${canMoveText ? 'cursor-move touch-none' : ''}`}
				style={{
					transform: `scale(${scaleFactor})`,
					transformOrigin: editable ? 'top left' : 'center center',
				}}
				onPointerDown={
					canMoveText
						? (event) => {
								beginPointerDrag(event, 'move');
							}
						: undefined
				}
			>
				{editable && (
					<div
						className={`pointer-events-none absolute -inset-2 border border-primary/70 ${isDragging ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.35)]' : 'shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'}`}
					/>
				)}
				<span
					className="relative inline-block w-full min-w-0 select-none whitespace-pre-wrap wrap-break-word"
					style={textBaseStyles}
				>
					{value}
				</span>
				{canResizeWidth && (
					<button
						type="button"
						onPointerDown={(event) => {
							beginPointerDrag(event, 'width');
						}}
						className="absolute right-0 top-1/2 z-20 h-3.5 w-3.5 translate-x-[85%] -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary bg-bg-elevated"
						aria-label="Resize text width"
					/>
				)}
				{canScaleText && (
					<button
						type="button"
						onPointerDown={(event) => {
							beginPointerDrag(event, 'scale', 1);
						}}
						className="absolute bottom-0 right-0 z-20 h-3.5 w-3.5 translate-x-[85%] translate-y-[85%] cursor-nwse-resize rounded-sm border border-primary bg-bg-elevated"
						aria-label="Scale text"
					/>
				)}
			</div>
		</div>
	);
}

export default memo(VideoText);
