import {
	memo,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ComponentPropsWithoutRef,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
} from 'react';
import Icon from '../../Icon';

export type SelectInputOption = {
	label: string;
	value: string;
	disabled?: boolean;
};

type SelectInputRenderState = {
	isSelected: boolean;
	isFocused: boolean;
};

export type SelectInputProps = Omit<
	ComponentPropsWithoutRef<'button'>,
	'children' | 'value' | 'onChange' | 'className'
> & {
	options: readonly SelectInputOption[];
	value?: string;
	onChangeValue?: (value: string) => void;
	onChange?: (value: string) => void;
	className?: string;
	containerClassName?: string;
	menuClassName?: string;
	placeholder?: string;
	ariaLabel?: string;
	renderSelectedValue?: (option: SelectInputOption | undefined) => ReactNode;
	renderOption?: (
		option: SelectInputOption,
		state: SelectInputRenderState,
	) => ReactNode;
};

function getFirstEnabledIndex(options: readonly SelectInputOption[]) {
	for (let index = 0; index < options.length; index += 1) {
		if (!options[index].disabled) {
			return index;
		}
	}

	return -1;
}

function getLastEnabledIndex(options: readonly SelectInputOption[]) {
	for (let index = options.length - 1; index >= 0; index -= 1) {
		if (!options[index].disabled) {
			return index;
		}
	}

	return -1;
}

function getNextEnabledIndex(
	options: readonly SelectInputOption[],
	startIndex: number,
	direction: 1 | -1,
) {
	if (options.length === 0) {
		return -1;
	}

	let nextIndex = startIndex;
	for (let step = 0; step < options.length; step += 1) {
		nextIndex = (nextIndex + direction + options.length) % options.length;
		if (!options[nextIndex].disabled) {
			return nextIndex;
		}
	}

	return -1;
}

function SelectInput({
	options,
	value,
	disabled = false,
	onChange,
	onChangeValue,
	onClick,
	onKeyDown,
	className,
	containerClassName = '',
	menuClassName = '',
	placeholder = 'Select option',
	ariaLabel,
	renderSelectedValue,
	renderOption,
	'aria-label': ariaLabelFromProps,
	...buttonProps
}: SelectInputProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const listboxId = useId();

	const selectedIndex = useMemo(() => {
		if (typeof value !== 'string') {
			return getFirstEnabledIndex(options);
		}

		return options.findIndex((option) => option.value === value);
	}, [options, value]);
	const selectedOption =
		selectedIndex >= 0 ? options[selectedIndex] : undefined;
	const resolvedAriaLabel = ariaLabel ?? ariaLabelFromProps ?? placeholder;
	const resolvedClassName =
		typeof className === 'string' && className.trim().length > 0
			? className
			: 'input';

	function closeMenu() {
		setIsOpen(false);
		setFocusedIndex(-1);
	}

	function focusOptionByIndex(index: number) {
		if (index < 0) {
			return;
		}

		setFocusedIndex(index);
		window.requestAnimationFrame(() => {
			const optionElement = optionRefs.current[index];
			optionElement?.focus();
			optionElement?.scrollIntoView({ block: 'nearest' });
		});
	}

	function openMenu(preferredIndex?: number) {
		if (disabled || options.length === 0) {
			return;
		}

		setIsOpen(true);

		const fallbackIndex = getFirstEnabledIndex(options);
		const initialIndex =
			typeof preferredIndex === 'number' && preferredIndex >= 0
				? preferredIndex
				: selectedIndex >= 0 && !options[selectedIndex]?.disabled
					? selectedIndex
					: fallbackIndex;

		focusOptionByIndex(initialIndex);
	}

	function selectOption(index: number) {
		const option = options[index];
		if (!option || option.disabled) {
			return;
		}

		if (option.value !== selectedOption?.value) {
			onChange?.(option.value);
			onChangeValue?.(option.value);
		}

		closeMenu();
		window.requestAnimationFrame(() => {
			buttonRef.current?.focus();
		});
	}

	function moveFocus(direction: 1 | -1) {
		const startIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
		const nextIndex = getNextEnabledIndex(options, startIndex, direction);
		focusOptionByIndex(nextIndex);
	}

	function handleTriggerClick(event: ReactMouseEvent<HTMLButtonElement>) {
		onClick?.(event);
		if (event.defaultPrevented || disabled) {
			return;
		}

		if (isOpen) {
			closeMenu();
			return;
		}

		openMenu();
	}

	function handleTriggerKeyDown(
		event: ReactKeyboardEvent<HTMLButtonElement>,
	) {
		onKeyDown?.(event);
		if (event.defaultPrevented || disabled) {
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					openMenu();
					return;
				}
				moveFocus(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				if (!isOpen) {
					openMenu(getLastEnabledIndex(options));
					return;
				}
				moveFocus(-1);
				return;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (!isOpen) {
					openMenu();
				}
				return;
			case 'Escape':
				if (isOpen) {
					event.preventDefault();
					closeMenu();
				}
				return;
		}
	}

	function handleOptionKeyDown(
		event: ReactKeyboardEvent<HTMLButtonElement>,
		index: number,
	) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				moveFocus(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				moveFocus(-1);
				return;
			case 'Home':
				event.preventDefault();
				focusOptionByIndex(getFirstEnabledIndex(options));
				return;
			case 'End':
				event.preventDefault();
				focusOptionByIndex(getLastEnabledIndex(options));
				return;
			case 'Enter':
			case ' ':
				event.preventDefault();
				selectOption(index);
				return;
			case 'Escape':
				event.preventDefault();
				closeMenu();
				window.requestAnimationFrame(() => {
					buttonRef.current?.focus();
				});
				return;
			case 'Tab':
				closeMenu();
				return;
		}
	}

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handleDocumentPointerDown(event: PointerEvent) {
			const root = rootRef.current;
			if (!root) {
				return;
			}

			if (event.target instanceof Node && !root.contains(event.target)) {
				closeMenu();
			}
		}

		function handleDocumentKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return;
			}

			event.preventDefault();
			closeMenu();
			window.requestAnimationFrame(() => {
				buttonRef.current?.focus();
			});
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeyDown);

		return () => {
			document.removeEventListener(
				'pointerdown',
				handleDocumentPointerDown,
			);
			document.removeEventListener('keydown', handleDocumentKeyDown);
		};
	}, [isOpen]);

	return (
		<div ref={rootRef} className={`relative ${containerClassName}`.trim()}>
			<button
				{...buttonProps}
				ref={buttonRef}
				type="button"
				disabled={disabled}
				aria-label={resolvedAriaLabel}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={isOpen ? listboxId : undefined}
				onClick={handleTriggerClick}
				onKeyDown={handleTriggerKeyDown}
				className={`peer flex w-full items-center gap-2 pr-9 text-left disabled:cursor-not-allowed disabled:opacity-60 ${resolvedClassName}`}
			>
				{renderSelectedValue ? (
					renderSelectedValue(selectedOption)
				) : (
					<span className="truncate">
						{selectedOption?.label ?? placeholder}
					</span>
				)}
				<span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-text-muted peer-disabled:opacity-60">
					<Icon
						name="chevronDown"
						className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					/>
				</span>
			</button>

			{isOpen ? (
				<div
					className={`absolute left-0 z-40 mt-1 w-full overflow-hidden rounded-xl border border-border bg-bg-elevated/95 shadow-2xl backdrop-blur-sm ${menuClassName}`}
				>
					<ul
						id={listboxId}
						role="listbox"
						aria-label={resolvedAriaLabel}
						className="max-h-56 space-y-1 overflow-y-auto p-1"
					>
						{options.map((option, index) => {
							const isSelected =
								option.value === selectedOption?.value;
							const isFocused = index === focusedIndex;
							const optionIsDisabled = Boolean(option.disabled);

							return (
								<li key={option.value} role="none">
									<button
										ref={(element) => {
											optionRefs.current[index] = element;
										}}
										type="button"
										role="option"
										aria-selected={isSelected}
										disabled={optionIsDisabled}
										onKeyDown={(event) => {
											handleOptionKeyDown(event, index);
										}}
										onFocus={() => {
											setFocusedIndex(index);
										}}
										onMouseMove={() => {
											if (focusedIndex !== index) {
												setFocusedIndex(index);
											}
										}}
										onClick={() => {
											selectOption(index);
										}}
										className={`w-full rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
											isSelected
												? 'border-primary/40 bg-primary/15 text-text-primary'
												: isFocused
													? 'border-border bg-bg-secondary/70 text-text-primary'
													: 'border-transparent bg-transparent text-text-secondary hover:border-border hover:bg-bg-secondary/70 hover:text-text-primary'
										}`}
									>
										{renderOption ? (
											renderOption(option, {
												isSelected,
												isFocused,
											})
										) : (
											<div className="truncate text-sm leading-tight">
												{option.label}
											</div>
										)}
									</button>
								</li>
							);
						})}
					</ul>
				</div>
			) : null}
		</div>
	);
}

export default memo(SelectInput);
