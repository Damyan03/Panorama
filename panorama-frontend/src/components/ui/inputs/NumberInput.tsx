import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type KeyboardEvent,
	type MouseEvent as ReactMouseEvent,
} from 'react';

type NumberInputProps = {
	value?: number;
	onChangeValue?: (value: number) => void;
	onCommit?: (value: number) => void;
	disabled?: boolean;
	className?: string;
	fitContent?: boolean;
	minContentWidthCh?: number;
	formatValue?: (value: number) => string;
	isAllowed?: (nextValue: string) => boolean;
	parseDraft?: (draftValue: string) => number;
	min?: number;
	max?: number;
	step?: number;
	precision?: number;
	ariaLabel?: string;
};

function countDecimals(value: number) {
	const valueAsString = String(value);
	const parts = valueAsString.split('.');

	return parts.length > 1 ? parts[1].length : 0;
}

function roundToPrecision(value: number, precision: number) {
	if (precision <= 0) {
		return Math.round(value);
	}

	const factor = 10 ** precision;
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeValue(
	rawValue: number,
	fallback: number,
	{
		min,
		max,
		step,
		precision,
	}: Pick<NumberInputProps, 'min' | 'max' | 'step' | 'precision'>,
) {
	if (!Number.isFinite(rawValue)) {
		return fallback;
	}

	let nextValue = rawValue;

	if (Number.isFinite(min)) {
		nextValue = Math.max(min as number, nextValue);
	}

	if (Number.isFinite(max)) {
		nextValue = Math.min(max as number, nextValue);
	}

	if (Number.isFinite(step) && (step as number) > 0) {
		const base = Number.isFinite(min) ? (min as number) : 0;
		nextValue =
			base +
			Math.round((nextValue - base) / (step as number)) *
				(step as number);
	}

	const resolvedPrecision = Number.isFinite(precision)
		? Math.max(0, precision as number)
		: Number.isFinite(step) && (step as number) > 0
			? countDecimals(step as number)
			: 0;

	nextValue = roundToPrecision(nextValue, resolvedPrecision);

	if (Number.isFinite(min)) {
		nextValue = Math.max(min as number, nextValue);
	}

	if (Number.isFinite(max)) {
		nextValue = Math.min(max as number, nextValue);
	}

	return nextValue;
}

function NumberInput({
	value = 0,
	onChangeValue,
	onCommit,
	disabled = false,
	className = '',
	formatValue,
	isAllowed,
	parseDraft,
	min = 0,
	max,
	step,
	precision,
	ariaLabel = 'Number input',
}: NumberInputProps) {
	const fallbackValue = Number.isFinite(min) ? (min as number) : 0;
	const safeValue = normalizeValue(value, fallbackValue, {
		min,
		max,
		step,
		precision,
	});
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(String(safeValue));
	const inputRef = useRef<HTMLInputElement | null>(null);
	const shouldUseDecimalKeyboard =
		(Number.isFinite(step) && countDecimals(step as number) > 0) ||
		(Number.isFinite(precision) && (precision as number) > 0);
	const pattern = isAllowed
		? undefined
		: shouldUseDecimalKeyboard
			? Number.isFinite(min) && (min as number) < 0
				? '-?[0-9]*[.]?[0-9]*'
				: '[0-9]*[.]?[0-9]*'
			: Number.isFinite(min) && (min as number) < 0
				? '-?[0-9]*'
				: '[0-9]*';
	const incrementStep =
		Number.isFinite(step) && (step as number) > 0 ? (step as number) : 1;

	const formattedValue = useMemo(() => {
		return formatValue ? formatValue(safeValue) : String(safeValue);
	}, [formatValue, safeValue]);
	const visibleValue = isEditing ? draft : formattedValue;

	function getFormattedDraft(nextValue: number) {
		return formatValue ? formatValue(nextValue) : String(nextValue);
	}

	useEffect(() => {
		if (!isEditing) {
			setDraft(String(safeValue));
		}
	}, [isEditing, safeValue]);

	function commitDraft(keepEditing = false) {
		const parsed = parseDraft
			? parseDraft(draft)
			: Number.parseFloat(draft);
		const nextValue = normalizeValue(parsed, safeValue, {
			min,
			max,
			step,
			precision,
		});
		const nextDraft = getFormattedDraft(nextValue);
		onCommit?.(nextValue);
		setDraft(nextDraft);
		setIsEditing(keepEditing);
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const next = event.target.value;

		if (!isAllowed || isAllowed(next)) {
			setDraft(next);

			if (typeof onChangeValue === 'function') {
				const parsed = parseDraft
					? parseDraft(next)
					: Number.parseFloat(next);

				if (Number.isFinite(parsed)) {
					onChangeValue(
						normalizeValue(parsed, safeValue, {
							min,
							max,
							step,
							precision,
						}),
					);
				}
			}
		}
	}

	function handleFocus() {
		setIsEditing(true);
		setDraft(getFormattedDraft(safeValue));
		window.requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	}

	function handleBlur() {
		commitDraft(false);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			commitDraft(true);
			return;
		}

		if (event.key === 'Escape') {
			setDraft(String(safeValue));
			setIsEditing(false);
		}
	}

	function nudgeValue(direction: 1 | -1) {
		const parsedDraft = parseDraft
			? parseDraft(draft)
			: Number.parseFloat(draft);
		const baseValue = normalizeValue(parsedDraft, safeValue, {
			min,
			max,
			step,
			precision,
		});
		const nextValue = normalizeValue(
			baseValue + incrementStep * direction,
			baseValue,
			{
				min,
				max,
				step,
				precision,
			},
		);

		if (nextValue === baseValue) {
			setIsEditing(false);
			setDraft(getFormattedDraft(nextValue));
			return;
		}

		const nextDraft = getFormattedDraft(nextValue);
		setIsEditing(false);
		setDraft(nextDraft);
		onChangeValue?.(nextValue);
		onCommit?.(nextValue);
	}

	function handleStepperMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
		event.preventDefault();
	}

	function handleDecrementClick() {
		nudgeValue(-1);
	}

	function handleIncrementClick() {
		nudgeValue(1);
	}

	return (
		<div
			className={`h-10 flex items-center overflow-hidden rounded bg-bg-secondary ring-1 ring-border focus-within:ring-2 focus-within:ring-focus-ring ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
		>
			<button
				type="button"
				disabled={disabled}
				onMouseDown={handleStepperMouseDown}
				onClick={handleDecrementClick}
				className="h-full w-9 shrink-0 border-r border-border text-base font-semibold text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={`Decrease ${ariaLabel}`}
			>
				-
			</button>
			<input
				ref={inputRef}
				type="text"
				inputMode={shouldUseDecimalKeyboard ? 'decimal' : 'numeric'}
				pattern={pattern}
				value={visibleValue}
				onChange={handleChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				className="h-full min-w-0 flex-1 bg-transparent px-2 text-center font-semibold text-text-primary outline-none disabled:cursor-not-allowed"
				aria-label={ariaLabel}
			/>
			<button
				type="button"
				disabled={disabled}
				onMouseDown={handleStepperMouseDown}
				onClick={handleIncrementClick}
				className="h-full w-9 shrink-0 border-l border-border text-base font-semibold text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={`Increase ${ariaLabel}`}
			>
				+
			</button>
		</div>
	);
}

export default NumberInput;
