import { memo, useCallback, useMemo, useRef } from 'react';
import type {
	TextHorizontalAlign,
	TextStyle,
} from '../../../../types/video';
import type { DraftTextColorPresetGroup } from '../../../../utils/editor/textColors';
import {
	useStylePatchHandler,
	useTextStylePanelFieldContext,
} from '../../../../hooks/editor/text/useTextStylePanelFieldContext';
import Icon, { type IconName } from '../../../Icon';
import { EDITOR_MAX_SCALE } from '../../../../constants/ui';
import { clampScalePercent } from '../../../../utils/math/clamp';
import {
	CheckboxInput,
	ColorInput,
	FontInput,
	NumberInput,
	SliderInput,
} from '../../../ui/inputs';

export {
	TextStylePanelFieldProvider,
	type PatchTextStyleHandler,
} from '../../../../hooks/editor/text/useTextStylePanelFieldContext';

type ToggleStyleKey = 'bold' | 'italic' | 'underline' | 'lineThrough';

type NumericTextStyleKey =
	| 'letterSpacingPx'
	| 'lineHeight'
	| 'edgeWidthPx'
	| 'dropShadowBlurPx'
	| 'dropShadowOffsetXPx'
	| 'dropShadowOffsetYPx';

type ColorTextStyleKey = 'color' | 'edgeColor' | 'dropShadowColor';

export type ColorPresetGroup = DraftTextColorPresetGroup;

const TOGGLE_ICON_BY_KEY: Record<ToggleStyleKey, IconName> = {
	bold: 'bold',
	italic: 'italic',
	underline: 'underline',
	lineThrough: 'strike',
};

const ALIGN_ICON_BY_VALUE: Record<TextHorizontalAlign, IconName> = {
	left: 'leftAlign',
	center: 'centerAlign',
	right: 'rightAlign',
};

const ALIGN_OPTIONS: ReadonlyArray<{
	label: string;
	value: TextHorizontalAlign;
}> = [
	{ label: 'Left', value: 'left' },
	{ label: 'Center', value: 'center' },
	{ label: 'Right', value: 'right' },
];

const FONT_FAMILY_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
	{ label: 'Inherit', value: 'inherit' },
	{ label: 'Arial', value: 'Arial, sans-serif' },
	{ label: 'Verdana', value: 'Verdana, sans-serif' },
	{ label: 'Trebuchet', value: "'Trebuchet MS', sans-serif" },
	{ label: 'Times', value: "'Times New Roman', serif" },
	{ label: 'Georgia', value: 'Georgia, serif' },
	{ label: 'Courier', value: "'Courier New', monospace" },
	{ label: 'Impact', value: 'Impact, fantasy' },
	{ label: 'Comic Sans', value: "'Comic Sans MS', cursive" },
];

function getToggleClass(active: boolean) {
	return `rounded border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
		active
			? 'border-primary bg-primary/20 text-primary'
			: 'border-border bg-bg-secondary text-text-primary'
	}`;
}

type TextStyleToggleControlsProps = {
	bold: boolean;
	italic: boolean;
	underline: boolean;
	lineThrough: boolean;
};

export const TextStyleToggleControls = memo(function TextStyleToggleControls({
	bold,
	italic,
	underline,
	lineThrough,
}: TextStyleToggleControlsProps) {
	const { canEditStyle, patchTextStyle } = useTextStylePanelFieldContext();

	const textToggleItems = useMemo(() => {
		return [
			{ key: 'bold', label: 'Bold', active: bold },
			{ key: 'italic', label: 'Italic', active: italic },
			{ key: 'underline', label: 'Underline', active: underline },
			{ key: 'lineThrough', label: 'Strike', active: lineThrough },
		] as const;
	}, [bold, italic, lineThrough, underline]);

	return (
		<div className="flex flex-col gap-1 text-xs text-text-muted">
			<span>Text style</span>
			<div className="flex items-center gap-1">
				{textToggleItems.map(({ key, label, active }) => {
					return (
						<button
							key={key}
							type="button"
							disabled={!canEditStyle}
							aria-label={label}
							aria-pressed={active}
							title={label}
							onClick={() => {
								patchTextStyle({
									[key]: !active,
								} as Partial<TextStyle>);
							}}
							className={`${getToggleClass(active)} h-8 w-8 p-1 justify-self-start px-0 flex items-center justify-center`}
						>
							<Icon
								name={TOGGLE_ICON_BY_KEY[key]}
								className="h-4 w-4"
							/>
						</button>
					);
				})}
			</div>
		</div>
	);
});

type TextAlignControlsProps = {
	textAlign: TextHorizontalAlign;
};

export const TextAlignControls = memo(function TextAlignControls({
	textAlign,
}: TextAlignControlsProps) {
	const { canEditStyle, patchTextStyle } = useTextStylePanelFieldContext();

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">Align</span>
			<div className="flex items-center gap-1">
				{ALIGN_OPTIONS.map((option) => {
					const isActive = textAlign === option.value;

					return (
						<button
							key={option.value}
							type="button"
							disabled={!canEditStyle}
							aria-label={option.label}
							aria-pressed={isActive}
							title={option.label}
							onClick={() => {
								if (isActive) return;
								patchTextStyle({ textAlign: option.value });
							}}
							className={`${getToggleClass(isActive)} h-8 w-8 p-1 px-0 flex items-center justify-center`}
						>
							<Icon
								name={ALIGN_ICON_BY_VALUE[option.value]}
								className="h-4 w-4"
							/>
						</button>
					);
				})}
			</div>
		</div>
	);
});

type NumberStyleFieldProps = {
	label: string;
	value: number;
	min: number;
	max: number;
	precision: number;
	step?: number;
	ariaLabel: string;
	styleKey: NumericTextStyleKey;
};

export const NumberStyleField = memo(function NumberStyleField({
	label,
	value,
	min,
	max,
	precision,
	step,
	ariaLabel,
	styleKey,
}: NumberStyleFieldProps) {
	const { canEditStyle } = useTextStylePanelFieldContext();
	const handlePatchValue = useStylePatchHandler(styleKey);

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">{label}</span>
			<NumberInput
				value={value}
				min={min}
				max={max}
				step={step}
				precision={precision}
				disabled={!canEditStyle}
				onChangeValue={handlePatchValue}
				onCommit={handlePatchValue}
				className="text-style-input"
				ariaLabel={ariaLabel}
			/>
		</div>
	);
});

type ScaleStyleFieldProps = {
	textItemId: number;
	scaleValue: number;
	onScalePreviewChange?: (textItemId: number, scale: number) => void;
	onScaleChange?: (textItemId: number, scale: number) => void;
};

export const ScaleStyleField = memo(function ScaleStyleField({
	textItemId,
	scaleValue,
	onScalePreviewChange,
	onScaleChange,
}: ScaleStyleFieldProps) {
	const latestScaleRef = useRef(scaleValue);
	latestScaleRef.current = scaleValue;

	const previewScaleHandler = onScalePreviewChange ?? onScaleChange;

	const handleScalePreviewChange = useCallback(
		(next: number) => {
			const nextScale = Math.round(clampScalePercent(next));
			if (nextScale === latestScaleRef.current) return;
			previewScaleHandler?.(textItemId, nextScale);
		},
		[previewScaleHandler, textItemId],
	);

	const handleScaleCommit = useCallback(
		(next: number) => {
			if (!onScalePreviewChange || !onScaleChange) {
				return;
			}

			const nextScale = Math.round(clampScalePercent(next));
			onScaleChange(textItemId, nextScale);
		},
		[onScaleChange, onScalePreviewChange, textItemId],
	);

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">Scale</span>
			<SliderInput
				value={scaleValue}
				max={EDITOR_MAX_SCALE}
				ariaLabel="Scale"
				onChange={handleScalePreviewChange}
				onCommit={onScalePreviewChange ? handleScaleCommit : undefined}
			/>
		</div>
	);
});

type OpacityStyleFieldProps = {
	opacity: number;
};

export const OpacityStyleField = memo(function OpacityStyleField({
	opacity,
}: OpacityStyleFieldProps) {
	const { canEditStyle } = useTextStylePanelFieldContext();
	const handlePreviewOpacityChange = useStylePatchHandler(
		'opacity',
		'preview',
	);
	const handleCommitOpacityChange = useStylePatchHandler('opacity', 'commit');

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">Opacity</span>
			<SliderInput
				value={opacity}
				min={0}
				max={100}
				disabled={!canEditStyle}
				ariaLabel="Text opacity"
				onChange={handlePreviewOpacityChange}
				onCommit={handleCommitOpacityChange}
			/>
		</div>
	);
});

type FontFamilyStyleFieldProps = {
	fontFamily: string;
};

export const FontFamilyStyleField = memo(function FontFamilyStyleField({
	fontFamily,
}: FontFamilyStyleFieldProps) {
	const { canEditStyle } = useTextStylePanelFieldContext();
	const handleFontFamilyChange = useStylePatchHandler('fontFamily');

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">Font family</span>
			<FontInput
				value={fontFamily}
				options={FONT_FAMILY_OPTIONS}
				disabled={!canEditStyle}
				onChangeValue={handleFontFamilyChange}
				className="text-style-input"
				aria-label="Font family"
			/>
		</div>
	);
});

type ColorStyleFieldProps = {
	label: string;
	value: string;
	ariaLabel: string;
	styleKey: ColorTextStyleKey;
	colorPresetGroups: readonly ColorPresetGroup[];
};

export const ColorStyleField = memo(function ColorStyleField({
	label,
	value,
	ariaLabel,
	styleKey,
	colorPresetGroups,
}: ColorStyleFieldProps) {
	const { canEditStyle } = useTextStylePanelFieldContext();
	const handlePreviewColorChange = useStylePatchHandler(styleKey, 'preview');
	const handleCommitColorChange = useStylePatchHandler(styleKey, 'commit');

	return (
		<div className="text-style-field-stack">
			<span className="text-style-field-label">{label}</span>
			<ColorInput
				value={value}
				disabled={!canEditStyle}
				colorPresetGroups={colorPresetGroups}
				onChangeValue={handlePreviewColorChange}
				onCommit={handleCommitColorChange}
				className="h-9"
				ariaLabel={ariaLabel}
			/>
		</div>
	);
});

type EdgeSectionProps = {
	edgeEnabled: boolean;
	edgeWidthPx: number;
	edgeColor: string;
	colorPresetGroups: readonly ColorPresetGroup[];
};

export const EdgeSection = memo(function EdgeSection({
	edgeEnabled,
	edgeWidthPx,
	edgeColor,
	colorPresetGroups,
}: EdgeSectionProps) {
	const { canEditStyle, patchTextStyle } = useTextStylePanelFieldContext();

	const handleToggleEdge = useCallback(
		(checked: boolean) => {
			patchTextStyle({ edgeEnabled: checked });
		},
		[patchTextStyle],
	);

	return (
		<div className="text-style-effect-section">
			<CheckboxInput
				checked={edgeEnabled}
				disabled={!canEditStyle}
				label="Character edge"
				labelClassName="text-xs font-medium uppercase tracking-wide text-text-muted"
				ariaLabel="Enable character edge"
				onChangeChecked={handleToggleEdge}
			/>
			{edgeEnabled ? (
				<EdgeSectionFields
					edgeWidthPx={edgeWidthPx}
					edgeColor={edgeColor}
					colorPresetGroups={colorPresetGroups}
				/>
			) : null}
		</div>
	);
});

type EdgeSectionFieldsProps = Pick<
	EdgeSectionProps,
	'edgeWidthPx' | 'edgeColor' | 'colorPresetGroups'
>;

const EdgeSectionFields = memo(function EdgeSectionFields({
	edgeWidthPx,
	edgeColor,
	colorPresetGroups,
}: EdgeSectionFieldsProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<NumberStyleField
				label="Edge width (px)"
				value={edgeWidthPx}
				min={0}
				max={12}
				precision={2}
				styleKey="edgeWidthPx"
				ariaLabel="Edge width"
			/>
			<ColorStyleField
				label="Edge color"
				value={edgeColor}
				styleKey="edgeColor"
				colorPresetGroups={colorPresetGroups}
				ariaLabel="Edge color"
			/>
		</div>
	);
});

type ShadowSectionProps = {
	shadowEnabled: boolean;
	shadowColor: string;
	shadowBlurPx: number;
	shadowOffsetXPx: number;
	shadowOffsetYPx: number;
	colorPresetGroups: readonly ColorPresetGroup[];
};

export const ShadowSection = memo(function ShadowSection({
	shadowEnabled,
	shadowColor,
	shadowBlurPx,
	shadowOffsetXPx,
	shadowOffsetYPx,
	colorPresetGroups,
}: ShadowSectionProps) {
	const { canEditStyle, patchTextStyle } = useTextStylePanelFieldContext();

	const handleToggleShadow = useCallback(
		(checked: boolean) => {
			patchTextStyle({ dropShadowEnabled: checked });
		},
		[patchTextStyle],
	);

	return (
		<div className="text-style-effect-section">
			<CheckboxInput
				checked={shadowEnabled}
				disabled={!canEditStyle}
				label="Drop shadow"
				labelClassName="text-xs font-medium uppercase tracking-wide text-text-muted"
				ariaLabel="Enable drop shadow"
				onChangeChecked={handleToggleShadow}
			/>
			{shadowEnabled ? (
				<ShadowSectionFields
					shadowColor={shadowColor}
					shadowBlurPx={shadowBlurPx}
					shadowOffsetXPx={shadowOffsetXPx}
					shadowOffsetYPx={shadowOffsetYPx}
					colorPresetGroups={colorPresetGroups}
				/>
			) : null}
		</div>
	);
});

type ShadowSectionFieldsProps = Pick<
	ShadowSectionProps,
	| 'shadowColor'
	| 'shadowBlurPx'
	| 'shadowOffsetXPx'
	| 'shadowOffsetYPx'
	| 'colorPresetGroups'
>;

const ShadowSectionFields = memo(function ShadowSectionFields({
	shadowColor,
	shadowBlurPx,
	shadowOffsetXPx,
	shadowOffsetYPx,
	colorPresetGroups,
}: ShadowSectionFieldsProps) {
	return (
		<div className="grid grid-cols-2 gap-2">
			<ColorStyleField
				label="Shadow color"
				value={shadowColor}
				styleKey="dropShadowColor"
				colorPresetGroups={colorPresetGroups}
				ariaLabel="Shadow color"
			/>
			<NumberStyleField
				label="Blur (px)"
				value={shadowBlurPx}
				min={0}
				max={80}
				precision={2}
				styleKey="dropShadowBlurPx"
				ariaLabel="Shadow blur"
			/>
			<NumberStyleField
				label="Offset X"
				value={shadowOffsetXPx}
				min={-40}
				max={40}
				precision={2}
				styleKey="dropShadowOffsetXPx"
				ariaLabel="Shadow offset x"
			/>
			<NumberStyleField
				label="Offset Y"
				value={shadowOffsetYPx}
				min={-40}
				max={40}
				precision={2}
				styleKey="dropShadowOffsetYPx"
				ariaLabel="Shadow offset y"
			/>
		</div>
	);
});
