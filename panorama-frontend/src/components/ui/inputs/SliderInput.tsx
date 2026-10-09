import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from 'react';

interface SliderInputProps {
	value?: number;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: number) => void;
	onCommit?: (value: number) => void;
	label?: string;
	vertical?: boolean;
	hideNumber?: boolean;
	disabled?: boolean;
	className?: string;
	ariaLabel?: string;
}

function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function countDecimals(value: number) {
	const valueAsString = String(value);
	const parts = valueAsString.split('.');

	return parts.length > 1 ? parts[1].length : 0;
}

function normalizeSliderValue(
	rawValue: number,
	min: number,
	max: number,
	step: number,
) {
	const clampedValue = clampNumber(rawValue, min, max);
	const steppedValue = min + Math.round((clampedValue - min) / step) * step;
	const precision = Math.max(0, countDecimals(step));

	return Number(clampNumber(steppedValue, min, max).toFixed(precision));
}

function toRatio(value: number, min: number, max: number) {
	if (max <= min) {
		return 0;
	}

	return clampNumber((value - min) / (max - min), 0, 1);
}

function SliderInput({
	value = 0,
	min = 0,
	max,
	step = 1,
	onChange,
	onCommit,
	vertical = false,
	hideNumber = false,
	disabled = false,
	className = '',
	ariaLabel = 'Slider input',
}: SliderInputProps) {
	const safeMin = Number.isFinite(min) ? min : 0;
	const safeMaxCandidate = Number.isFinite(max) ? (max as number) : 100;
	const safeMax = Math.max(safeMin, safeMaxCandidate);
	const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
	const safeValue = useMemo(() => {
		return normalizeSliderValue(value, safeMin, safeMax, safeStep);
	}, [safeMax, safeMin, safeStep, value]);

	const [internalValue, setInternalValue] = useState(safeValue);
	const trackRef = useRef<HTMLDivElement | null>(null);
	const isDraggingRef = useRef(false);
	const internalValueRef = useRef(internalValue);

	useEffect(() => {
		internalValueRef.current = internalValue;
	}, [internalValue]);

	useEffect(() => {
		if (isDraggingRef.current) {
			return;
		}

		setInternalValue(safeValue);
		internalValueRef.current = safeValue;
	}, [safeValue]);

	const emitChange = useCallback(
		(nextValue: number) => {
			if (nextValue === internalValueRef.current) {
				return;
			}

			internalValueRef.current = nextValue;
			setInternalValue(nextValue);
			onChange?.(nextValue);
		},
		[onChange],
	);

	const updateFromClient = useCallback(
		(clientX: number, clientY: number) => {
			const track = trackRef.current;
			if (!track) {
				return;
			}

			const rect = track.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				return;
			}

			const ratio = vertical
				? 1 - (clientY - rect.top) / rect.height
				: (clientX - rect.left) / rect.width;
			const normalizedRatio = clampNumber(ratio, 0, 1);
			const rawValue = safeMin + normalizedRatio * (safeMax - safeMin);
			const nextValue = normalizeSliderValue(
				rawValue,
				safeMin,
				safeMax,
				safeStep,
			);

			emitChange(nextValue);
		},
		[emitChange, safeMax, safeMin, safeStep, vertical],
	);

	const handleCommit = useCallback(() => {
		onCommit?.(internalValueRef.current);
	}, [onCommit]);

	function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		if (disabled) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		isDraggingRef.current = true;
		updateFromClient(event.clientX, event.clientY);
	}

	function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isDraggingRef.current) {
			return;
		}

		updateFromClient(event.clientX, event.clientY);
	}

	function finishPointerDrag(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		if (!isDraggingRef.current) {
			return;
		}

		isDraggingRef.current = false;
		handleCommit();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (disabled) {
			return;
		}

		const currentValue = internalValueRef.current;
		const largeStep = safeStep * 10;
		let nextValue: number;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				nextValue = currentValue + safeStep;
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				nextValue = currentValue - safeStep;
				break;
			case 'PageUp':
				nextValue = currentValue + largeStep;
				break;
			case 'PageDown':
				nextValue = currentValue - largeStep;
				break;
			case 'Home':
				nextValue = safeMin;
				break;
			case 'End':
				nextValue = safeMax;
				break;
			default:
				return;
		}

		event.preventDefault();

		const normalized = normalizeSliderValue(
			nextValue,
			safeMin,
			safeMax,
			safeStep,
		);
		if (normalized === currentValue) {
			return;
		}

		emitChange(normalized);
		handleCommit();
	}

	const ratio = useMemo(() => {
		return toRatio(internalValue, safeMin, safeMax);
	}, [internalValue, safeMax, safeMin]);
	const displayValue = useMemo(() => {
		const precision = Math.max(0, countDecimals(safeStep));

		if (precision === 0) {
			return String(Math.round(internalValue));
		}

		return internalValue.toFixed(precision);
	}, [internalValue, safeStep]);

	const trackInteractionClass = disabled
		? 'cursor-not-allowed opacity-60'
		: 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main';
	const numberDisplay = !hideNumber && (
		<span className="w-12 text-center text-sm font-semibold text-label-md tabular-nums">
			{displayValue}%
		</span>
	);
	const ratioPercent = `${ratio * 100}%`;

	const trackProps = {
		ref: trackRef,
		role: 'slider' as const,
		tabIndex: disabled ? -1 : 0,
		'aria-label': ariaLabel,
		'aria-valuemin': safeMin,
		'aria-valuemax': safeMax,
		'aria-valuenow': internalValue,
		'aria-valuetext': `${displayValue}%`,
		onKeyDown: handleKeyDown,
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: finishPointerDrag,
		onPointerCancel: finishPointerDrag,
		onLostPointerCapture: finishPointerDrag,
	};

	if (vertical) {
		return (
			<div
				className={`flex h-full flex-col items-center justify-center gap-2 px-3 py-2 ${className}`}
			>
				<div
					{...trackProps}
					aria-orientation="vertical"
					className={`relative h-full min-h-28 w-6 touch-none select-none rounded ${trackInteractionClass}`}
				>
					<div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-2 -translate-x-1/2 rounded-full bg-ui-subtle/80" />
					<div
						className="pointer-events-none absolute bottom-0 left-1/2 w-2 -translate-x-1/2 rounded-full bg-primary"
						style={{ height: ratioPercent }}
					/>
					<div
						className="slider-thumb pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/80 bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
						style={{ top: `${(1 - ratio) * 100}%` }}
					/>
				</div>
				{numberDisplay}
			</div>
		);
	}

	return (
		<div
			className={`flex w-full items-center gap-2 px-2 py-2 ${className}`}
		>
			<div
				{...trackProps}
				aria-orientation="horizontal"
				className={`relative h-6 w-full touch-none select-none rounded ${trackInteractionClass}`}
			>
				<div className="pointer-events-none absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-ui-subtle/80" />
				<div
					className="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
					style={{ width: ratioPercent }}
				/>
				<div
					className="slider-thumb pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/80 bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
					style={{ left: ratioPercent }}
				/>
			</div>
			{numberDisplay}
		</div>
	);
}

export default memo(SliderInput);
