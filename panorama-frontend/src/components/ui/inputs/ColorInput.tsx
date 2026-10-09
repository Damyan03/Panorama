import {
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
	DEFAULT_COLOR,
	HEX_COLOR_PATTERN,
	clampNumber,
	hsvToHsl,
	hexToHsl,
	hslToHex,
	normalizeHexColor,
	normalizePresetColor,
	toPickerHex,
	type HslColor,
} from '../../../utils/color';
import Icon from '../../Icon';
import HslGradientCanvas from './HslGradientCanvas';

type ColorInputProps = {
	value?: string;
	onChangeValue?: (value: string) => void;
	onCommit?: (value: string) => void;
	disabled?: boolean;
	className?: string;
	ariaLabel?: string;
	colorPresets?: readonly string[];
	colorPresetGroups?: readonly ColorPresetGroup[];
};

const HEX_DRAFT_PATTERN = /^#?[0-9a-f]{0,8}$/i;
const HSL_GRADIENT_WIDTH = 220;
const HSL_GRADIENT_HEIGHT = 140;
const POPUP_EDGE_PADDING_PX = 8;
const POPUP_OFFSET_PX = 8;
const HUE_TRACK_GRADIENT =
	'linear-gradient(to right, #ff0000 0%, #ffff00 16.66%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.66%, #ff00ff 83.33%, #ff0000 100%)';

export type ColorPresetGroup = {
	label: string;
	colors: readonly string[];
};

type EyeDropperOpenResult = {
	sRGBHex: string;
};

type EyeDropperInstance = {
	open: () => Promise<EyeDropperOpenResult>;
};

type EyeDropperWindow = Window & {
	EyeDropper?: new () => EyeDropperInstance;
};

type EyeDropperButtonProps = {
	disabled: boolean;
	isSupported: boolean;
	onPick: () => void;
};

type PopupPlacement = 'top' | 'bottom';

function findNearestScrollableAncestor(
	element: HTMLElement | null,
): HTMLElement | null {
	let current: HTMLElement | null = element?.parentElement ?? null;

	while (current) {
		const styles = window.getComputedStyle(current);
		const overflowValues = `${styles.overflow} ${styles.overflowY} ${styles.overflowX}`;
		const isScrollable = /(auto|scroll|overlay)/.test(overflowValues);

		if (isScrollable && current.scrollHeight > current.clientHeight) {
			return current;
		}

		current = current.parentElement;
	}

	return null;
}

const EyeDropperButton = memo(function EyeDropperButton({
	disabled,
	isSupported,
	onPick,
}: EyeDropperButtonProps) {
	return (
		<button
			type="button"
			onClick={onPick}
			disabled={disabled || !isSupported}
			className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-bg-secondary text-text-muted transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Pick color from screen"
			title={
				isSupported
					? 'Pick color from screen'
					: 'Screen color picker is not supported in this browser'
			}
		>
			<Icon name="eyedropper" className="h-4 w-4" />
		</button>
	);
});

function normalizeColorPresetList(colorPresets: readonly string[]) {
	const uniquePresets: string[] = [];
	const seenPresets = new Set<string>();

	for (const preset of colorPresets) {
		const normalizedPreset = normalizePresetColor(preset);
		if (!normalizedPreset || seenPresets.has(normalizedPreset)) {
			continue;
		}

		seenPresets.add(normalizedPreset);
		uniquePresets.push(normalizedPreset);
	}

	return uniquePresets;
}

function ColorInput({
	value = DEFAULT_COLOR,
	onChangeValue,
	onCommit,
	disabled = false,
	className = '',
	ariaLabel = 'Color input',
	colorPresets = [],
	colorPresetGroups,
}: ColorInputProps) {
	const safeValue = useMemo(() => {
		return normalizeHexColor(value, DEFAULT_COLOR);
	}, [value]);
	const [isOpen, setIsOpen] = useState(false);
	const [isEditingText, setIsEditingText] = useState(false);
	const [draft, setDraft] = useState(safeValue);
	const [hsl, setHsl] = useState<HslColor>(() => hexToHsl(safeValue));
	const rootRef = useRef<HTMLDivElement | null>(null);
	const popupRef = useRef<HTMLDivElement | null>(null);
	const gradientTrackRef = useRef<HTMLDivElement | null>(null);
	const hueTrackRef = useRef<HTMLDivElement | null>(null);
	const textInputRef = useRef<HTMLInputElement | null>(null);
	const draftRef = useRef(draft);
	const hslRef = useRef(hsl);
	const lastEmittedRef = useRef(safeValue);
	const disabledRef = useRef(disabled);
	const pendingColorRef = useRef<string | null>(null);
	const emitFrameRef = useRef<number | null>(null);
	const isDraggingGradientRef = useRef(false);
	const isDraggingHueRef = useRef(false);
	const previousBodyOverflowRef = useRef<string | null>(null);
	const [popupLeft, setPopupLeft] = useState(POPUP_EDGE_PADDING_PX);
	const [popupTop, setPopupTop] = useState(POPUP_EDGE_PADDING_PX);
	const [popupPlacement, setPopupPlacement] =
		useState<PopupPlacement>('bottom');
	const isEyeDropperSupported = useMemo(() => {
		if (typeof window === 'undefined') {
			return false;
		}

		return typeof (window as EyeDropperWindow).EyeDropper === 'function';
	}, []);
	const normalizedColorPresetGroups = useMemo(() => {
		const presetGroups = colorPresetGroups ?? [];

		if (presetGroups.length > 0) {
			return presetGroups
				.map((group) => {
					return {
						label: group.label,
						colors: normalizeColorPresetList(group.colors),
					};
				})
				.filter((group) => group.colors.length > 0);
		}

		const normalizedColorPresets = normalizeColorPresetList(colorPresets);
		if (normalizedColorPresets.length === 0) {
			return [];
		}

		return [
			{
				label: 'Used in this draft',
				colors: normalizedColorPresets,
			},
		];
	}, [colorPresetGroups, colorPresets]);
	disabledRef.current = disabled;

	const lockPageScroll = useCallback(() => {
		if (previousBodyOverflowRef.current !== null) {
			return;
		}

		previousBodyOverflowRef.current = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}, []);

	const unlockPageScroll = useCallback(() => {
		if (previousBodyOverflowRef.current === null) {
			return;
		}

		document.body.style.overflow = previousBodyOverflowRef.current;
		previousBodyOverflowRef.current = null;
	}, []);

	const maybeUnlockPageScroll = useCallback(() => {
		if (isDraggingGradientRef.current || isDraggingHueRef.current) {
			return;
		}

		unlockPageScroll();
	}, [unlockPageScroll]);

	const updatePopupPosition = useCallback(() => {
		if (!isOpen) {
			return;
		}

		const root = rootRef.current;
		const popup = popupRef.current;
		if (!root || !popup) {
			return;
		}

		const rootRect = root.getBoundingClientRect();
		const popupWidth = popup.offsetWidth;
		const idealLeft = rootRect.left;
		const shouldAlignRight =
			idealLeft + popupWidth > window.innerWidth - POPUP_EDGE_PADDING_PX;
		const preferredLeft = shouldAlignRight
			? rootRect.right - popupWidth
			: idealLeft;
		const maxLeft = Math.max(
			POPUP_EDGE_PADDING_PX,
			window.innerWidth - popupWidth - POPUP_EDGE_PADDING_PX,
		);
		const clampedLeft = clampNumber(
			preferredLeft,
			POPUP_EDGE_PADDING_PX,
			maxLeft,
		);

		setPopupLeft((currentLeft) => {
			if (currentLeft === clampedLeft) {
				return currentLeft;
			}

			return clampedLeft;
		});

		const popupHeight = popup.offsetHeight;
		const scrollContainer = findNearestScrollableAncestor(root);
		let boundaryTop = POPUP_EDGE_PADDING_PX;
		let boundaryBottom = window.innerHeight - POPUP_EDGE_PADDING_PX;

		if (scrollContainer) {
			const containerRect = scrollContainer.getBoundingClientRect();
			boundaryTop = containerRect.top + POPUP_EDGE_PADDING_PX;
			boundaryBottom = containerRect.bottom - POPUP_EDGE_PADDING_PX;
		}

		const spaceBelow = boundaryBottom - rootRect.bottom - POPUP_OFFSET_PX;
		const spaceAbove = rootRect.top - boundaryTop - POPUP_OFFSET_PX;
		const nextPlacement: PopupPlacement =
			spaceBelow >= popupHeight || spaceBelow >= spaceAbove
				? 'bottom'
				: 'top';
		const preferredTop =
			nextPlacement === 'bottom'
				? rootRect.bottom + POPUP_OFFSET_PX
				: rootRect.top - popupHeight - POPUP_OFFSET_PX;
		const maxTop = Math.max(
			POPUP_EDGE_PADDING_PX,
			window.innerHeight - popupHeight - POPUP_EDGE_PADDING_PX,
		);
		const clampedTop = clampNumber(
			preferredTop,
			POPUP_EDGE_PADDING_PX,
			maxTop,
		);

		setPopupTop((currentTop) => {
			if (currentTop === clampedTop) {
				return currentTop;
			}

			return clampedTop;
		});

		setPopupPlacement((currentPlacement) => {
			if (currentPlacement === nextPlacement) {
				return currentPlacement;
			}

			return nextPlacement;
		});
	}, [isOpen]);

	const resetToSafeColor = useCallback(() => {
		const nextColor = safeValue;
		const nextHsl = hexToHsl(nextColor);
		draftRef.current = nextColor;
		setDraft(nextColor);
		hslRef.current = nextHsl;
		setHsl(nextHsl);
	}, [safeValue]);

	useEffect(() => {
		draftRef.current = draft;
	}, [draft]);

	useEffect(() => {
		hslRef.current = hsl;
	}, [hsl]);

	const emitColorChange = useCallback(
		(nextColor: string, commit = false) => {
			const normalized = normalizeHexColor(nextColor, safeValue);

			if (commit) {
				if (emitFrameRef.current !== null) {
					window.cancelAnimationFrame(emitFrameRef.current);
					emitFrameRef.current = null;
				}

				pendingColorRef.current = null;

				if (normalized !== lastEmittedRef.current) {
					lastEmittedRef.current = normalized;
					onChangeValue?.(normalized);
				}

				onCommit?.(normalized);
				return;
			}

			pendingColorRef.current = normalized;

			if (emitFrameRef.current !== null) {
				return;
			}

			emitFrameRef.current = window.requestAnimationFrame(() => {
				emitFrameRef.current = null;

				const queued = pendingColorRef.current;
				pendingColorRef.current = null;

				if (!queued || queued === lastEmittedRef.current) {
					return;
				}

				lastEmittedRef.current = queued;
				onChangeValue?.(queued);
			});
		},
		[onChangeValue, onCommit, safeValue],
	);
	const emitColorChangeRef = useRef(emitColorChange);

	useEffect(() => {
		emitColorChangeRef.current = emitColorChange;
	}, [emitColorChange]);

	const commitDraft = useCallback(
		(keepEditing = false) => {
			const nextColor = normalizeHexColor(draftRef.current, safeValue);
			const nextHsl = hexToHsl(nextColor);

			draftRef.current = nextColor;
			setDraft(nextColor);
			hslRef.current = nextHsl;
			setHsl(nextHsl);
			emitColorChange(nextColor, true);
			setIsEditingText(keepEditing);
		},
		[emitColorChange, safeValue],
	);

	const applyHsl = useCallback(
		(next: HslColor, commit = false) => {
			const nextHsl: HslColor = {
				h: clampNumber(next.h, 0, 360),
				s: clampNumber(next.s, 0, 100),
				l: clampNumber(next.l, 0, 100),
			};
			const nextColor = hslToHex(nextHsl);

			hslRef.current = nextHsl;
			setHsl(nextHsl);
			draftRef.current = nextColor;
			setDraft(nextColor);
			emitColorChange(nextColor, commit);
		},
		[emitColorChange],
	);

	const updateFromGradientClient = useCallback(
		(clientX: number, clientY: number, commit = false) => {
			const track = gradientTrackRef.current;
			if (!track) {
				return;
			}

			const rect = track.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) {
				return;
			}

			const saturation = clampNumber(
				((clientX - rect.left) / rect.width) * 100,
				0,
				100,
			);
			const value = clampNumber(
				100 - ((clientY - rect.top) / rect.height) * 100,
				0,
				100,
			);
			const nextHsl = hsvToHsl({
				h: hslRef.current.h,
				s: saturation,
				v: value,
			});

			applyHsl(
				{
					...hslRef.current,
					s: nextHsl.s,
					l: nextHsl.l,
				},
				commit,
			);
		},
		[applyHsl],
	);

	const updateHueFromClient = useCallback(
		(clientX: number, commit = false) => {
			const track = hueTrackRef.current;
			if (!track) {
				return;
			}

			const rect = track.getBoundingClientRect();
			if (rect.width <= 0) {
				return;
			}

			const hue = clampNumber(
				((clientX - rect.left) / rect.width) * 360,
				0,
				360,
			);

			applyHsl(
				{
					...hslRef.current,
					h: hue,
				},
				commit,
			);
		},
		[applyHsl],
	);

	useEffect(() => {
		lastEmittedRef.current = safeValue;

		if (
			isDraggingGradientRef.current ||
			isDraggingHueRef.current ||
			isEditingText
		) {
			return;
		}

		const syncedHsl = hexToHsl(safeValue);
		draftRef.current = safeValue;
		setDraft(safeValue);
		hslRef.current = syncedHsl;
		setHsl(syncedHsl);
	}, [isEditingText, safeValue]);

	useEffect(() => {
		return () => {
			if (emitFrameRef.current !== null) {
				window.cancelAnimationFrame(emitFrameRef.current);
			}

			unlockPageScroll();
		};
	}, [unlockPageScroll]);

	useEffect(() => {
		if (isOpen) {
			return;
		}

		maybeUnlockPageScroll();
	}, [isOpen, maybeUnlockPageScroll]);

	useLayoutEffect(() => {
		if (!isOpen) {
			setPopupLeft(POPUP_EDGE_PADDING_PX);
			setPopupTop(POPUP_EDGE_PADDING_PX);
			setPopupPlacement('bottom');
			return;
		}

		let viewportFrameId: number | null = null;
		updatePopupPosition();

		function handleViewportChange() {
			if (viewportFrameId !== null) {
				return;
			}

			viewportFrameId = window.requestAnimationFrame(() => {
				viewportFrameId = null;
				updatePopupPosition();
			});
		}

		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('scroll', handleViewportChange, true);

		function handleDocumentPointerDown(event: PointerEvent) {
			if (!rootRef.current) {
				return;
			}

			const popup = popupRef.current;

			if (
				event.target instanceof Node &&
				!rootRef.current.contains(event.target) &&
				(!popup || !popup.contains(event.target))
			) {
				setIsOpen(false);
				commitDraft(false);
			}
		}

		function handleDocumentKeyDown(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return;
			}

			event.preventDefault();
			setIsOpen(false);
			setIsEditingText(false);
			resetToSafeColor();
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeyDown);

		return () => {
			if (viewportFrameId !== null) {
				window.cancelAnimationFrame(viewportFrameId);
			}
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('scroll', handleViewportChange, true);
			document.removeEventListener(
				'pointerdown',
				handleDocumentPointerDown,
			);
			document.removeEventListener('keydown', handleDocumentKeyDown);
		};
	}, [commitDraft, isOpen, resetToSafeColor, updatePopupPosition]);

	function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
		const next = event.target.value;
		if (!HEX_DRAFT_PATTERN.test(next)) {
			return;
		}

		draftRef.current = next;
		setDraft(next);

		const nextColor = normalizeHexColor(next, '');
		if (HEX_COLOR_PATTERN.test(nextColor)) {
			const nextHsl = hexToHsl(nextColor);
			hslRef.current = nextHsl;
			setHsl(nextHsl);
			emitColorChange(nextColor);
		}
	}

	function handleTextFocus() {
		setIsEditingText(true);
		window.requestAnimationFrame(() => {
			textInputRef.current?.select();
		});
	}

	function handleTextBlur() {
		commitDraft(false);
	}

	function handleTextKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			commitDraft(true);
			return;
		}

		if (event.key === 'Escape') {
			resetToSafeColor();
			setIsEditingText(false);
		}
	}

	function handleTogglePopup() {
		if (disabled) {
			return;
		}

		setIsOpen((current) => !current);
	}

	function handleGradientPointerDown(
		event: ReactPointerEvent<HTMLDivElement>,
	) {
		if (disabled) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		isDraggingGradientRef.current = true;
		if (event.pointerType !== 'mouse') {
			lockPageScroll();
		}
		updateFromGradientClient(event.clientX, event.clientY, false);
	}

	const finishGradientDrag = useCallback(
		(clientX?: number, clientY?: number) => {
			if (!isDraggingGradientRef.current) {
				return;
			}

			isDraggingGradientRef.current = false;
			maybeUnlockPageScroll();

			if (typeof clientX === 'number' && typeof clientY === 'number') {
				updateFromGradientClient(clientX, clientY, true);
				return;
			}

			emitColorChange(hslToHex(hslRef.current), true);
		},
		[emitColorChange, maybeUnlockPageScroll, updateFromGradientClient],
	);

	function handleGradientPointerMove(
		event: ReactPointerEvent<HTMLDivElement>,
	) {
		if (!isDraggingGradientRef.current || event.buttons === 0) {
			return;
		}

		updateFromGradientClient(event.clientX, event.clientY, false);
	}

	function handleGradientPointerEnd(
		event: ReactPointerEvent<HTMLDivElement>,
	) {
		if (!isDraggingGradientRef.current) {
			return;
		}

		finishGradientDrag(event.clientX, event.clientY);

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function handleGradientPointerCancel(
		event: ReactPointerEvent<HTMLDivElement>,
	) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		finishGradientDrag();
	}

	function handleGradientLostPointerCapture() {
		finishGradientDrag();
	}

	function handleHuePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		if (disabled) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		isDraggingHueRef.current = true;
		if (event.pointerType !== 'mouse') {
			lockPageScroll();
		}
		updateHueFromClient(event.clientX, false);
	}

	const finishHueDrag = useCallback(
		(clientX?: number) => {
			if (!isDraggingHueRef.current) {
				return;
			}

			isDraggingHueRef.current = false;
			maybeUnlockPageScroll();

			if (typeof clientX === 'number') {
				updateHueFromClient(clientX, true);
				return;
			}

			emitColorChange(hslToHex(hslRef.current), true);
		},
		[emitColorChange, maybeUnlockPageScroll, updateHueFromClient],
	);

	function handleHuePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isDraggingHueRef.current || event.buttons === 0) {
			return;
		}

		updateHueFromClient(event.clientX, false);
	}

	function handleHuePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isDraggingHueRef.current) {
			return;
		}

		finishHueDrag(event.clientX);

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function handleHuePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		finishHueDrag();
	}

	function handleHueLostPointerCapture() {
		finishHueDrag();
	}

	function handlePresetSelect(nextPreset: string) {
		if (disabled) {
			return;
		}

		const normalizedPreset = normalizePresetColor(nextPreset);
		if (!normalizedPreset) {
			return;
		}

		const nextHsl = hexToHsl(normalizedPreset);
		hslRef.current = nextHsl;
		setHsl(nextHsl);
		draftRef.current = normalizedPreset;
		setDraft(normalizedPreset);
		setIsEditingText(false);
		emitColorChange(normalizedPreset, true);
	}

	const handleEyeDropperPick = useCallback(async () => {
		if (disabledRef.current || !isEyeDropperSupported) {
			return;
		}

		const EyeDropperConstructor = (window as EyeDropperWindow).EyeDropper;
		if (!EyeDropperConstructor) {
			return;
		}

		try {
			const eyeDropper = new EyeDropperConstructor();
			const result = await eyeDropper.open();
			const nextColor = normalizeHexColor(result.sRGBHex, '');

			if (!HEX_COLOR_PATTERN.test(nextColor)) {
				return;
			}

			const nextHsl = hexToHsl(nextColor);
			hslRef.current = nextHsl;
			setHsl(nextHsl);
			draftRef.current = nextColor;
			setDraft(nextColor);
			setIsEditingText(false);
			emitColorChangeRef.current(nextColor, true);
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return;
			}
		}
	}, [isEyeDropperSupported]);

	const handleEyeDropperButtonClick = useCallback(() => {
		void handleEyeDropperPick();
	}, [handleEyeDropperPick]);

	const hueThumbLeft = `${(clampNumber(hsl.h, 0, 360) / 360) * 100}%`;
	const previewColor = toPickerHex(isEditingText ? draft : safeValue);

	return (
		<div ref={rootRef} className="relative w-full">
			<div
				className={`flex h-10 w-full items-center gap-2 rounded bg-bg-secondary px-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-focus-ring ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
			>
				<button
					type="button"
					onClick={handleTogglePopup}
					disabled={disabled}
					className="h-7 w-9 shrink-0 rounded border border-border disabled:cursor-not-allowed"
					style={{ backgroundColor: previewColor }}
					aria-label={`${ariaLabel} picker`}
				/>
				<input
					ref={textInputRef}
					type="text"
					value={isEditingText ? draft : safeValue}
					onChange={handleTextChange}
					onFocus={handleTextFocus}
					onBlur={handleTextBlur}
					onKeyDown={handleTextKeyDown}
					disabled={disabled}
					className="min-w-0 flex-1 bg-transparent text-right text-sm font-semibold uppercase text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed"
					placeholder="#rrggbb"
					aria-label={ariaLabel}
				/>
			</div>

			{isOpen && !disabled
				? createPortal(
						<div
							ref={popupRef}
							className={`fixed z-70 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-bg-elevated p-3 shadow-xl ${
								popupPlacement === 'top'
									? 'origin-bottom'
									: 'origin-top'
							}`}
							style={{
								left: `${popupLeft}px`,
								top: `${popupTop}px`,
							}}
						>
							<div
								ref={gradientTrackRef}
								className="relative h-36 w-full cursor-crosshair touch-none select-none rounded border border-border"
								onPointerDown={handleGradientPointerDown}
								onPointerMove={handleGradientPointerMove}
								onPointerUp={handleGradientPointerEnd}
								onPointerCancel={handleGradientPointerCancel}
								onLostPointerCapture={
									handleGradientLostPointerCapture
								}
							>
								<HslGradientCanvas
									hue={hsl.h}
									saturation={hsl.s}
									lightness={hsl.l}
									width={HSL_GRADIENT_WIDTH}
									height={HSL_GRADIENT_HEIGHT}
								/>
							</div>

							<div className="mt-3 flex items-center gap-2">
								<EyeDropperButton
									disabled={disabled}
									isSupported={isEyeDropperSupported}
									onPick={handleEyeDropperButtonClick}
								/>
								<div
									ref={hueTrackRef}
									className="relative h-3 flex-1 cursor-ew-resize touch-none select-none rounded border border-border"
									style={{
										backgroundImage: HUE_TRACK_GRADIENT,
									}}
									onPointerDown={handleHuePointerDown}
									onPointerMove={handleHuePointerMove}
									onPointerUp={handleHuePointerEnd}
									onPointerCancel={handleHuePointerCancel}
									onLostPointerCapture={
										handleHueLostPointerCapture
									}
								>
									<div
										className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75)]"
										style={{
											left: hueThumbLeft,
											backgroundColor: hslToHex({
												h: hsl.h,
												s: 100,
												l: 50,
											}),
										}}
									/>
								</div>
							</div>

							{normalizedColorPresetGroups.length > 0 ? (
								<div className="mt-3 border-t border-border pt-2">
									{normalizedColorPresetGroups.map(
										(group, index) => {
											return (
												<div
													key={`${group.label}-${index}`}
													className={
														index > 0 ? 'mt-3' : ''
													}
												>
													<div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
														{group.label}
													</div>
													<div className="flex flex-wrap gap-2">
														{group.colors.map(
															(presetColor) => {
																const isActive =
																	toPickerHex(
																		safeValue,
																	) ===
																	presetColor;

																return (
																	<button
																		key={
																			presetColor
																		}
																		type="button"
																		onClick={() => {
																			handlePresetSelect(
																				presetColor,
																			);
																		}}
																		className="h-6 w-6 rounded border border-border transition-transform hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
																		style={{
																			backgroundColor:
																				presetColor,
																			boxShadow:
																				isActive
																					? 'inset 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 1px rgba(0,0,0,0.75)'
																					: undefined,
																		}}
																		aria-label={`Use preset color ${presetColor}`}
																	/>
																);
															},
														)}
													</div>
												</div>
											);
										},
									)}
								</div>
							) : null}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}

export default memo(ColorInput);
