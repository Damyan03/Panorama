import { memo, useEffect, useMemo, useReducer } from 'react';
import type { TextItem, TextStyle } from '../../../../types/video';
import {
	useStableReadonlyStringArray,
	useTextStylePanelPatchHandler,
} from '../../../../hooks/editor/text/useTextStylePanelFieldContext';
import { clampScalePercent } from '../../../../utils/math/clamp';
import {
	EMPTY_COLOR_PRESETS,
	buildDraftTextColorPresetGroups,
} from '../../../../utils/editor/textColors';
import { normalizeTextStyle } from '../../../../utils/editor/textStyle';
import { areTextStylePanelPropsEqual } from '../../../../utils/editor/textOptimise';
import useDebouncedValue from '../../../../hooks/useDebouncedValue';
import {
	ColorStyleField,
	EdgeSection,
	FontFamilyStyleField,
	NumberStyleField,
	OpacityStyleField,
	ScaleStyleField,
	ShadowSection,
	TextAlignControls,
	TextStylePanelFieldProvider,
	TextStyleToggleControls,
} from './TextStylePanelFields';

type TextStyleSettingsPanelProps = {
	textItem: TextItem;
	onScalePreviewChange?: (textItemId: number, scale: number) => void;
	onScaleChange?: (textItemId: number, scale: number) => void;
	onStylePreviewChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onStyleChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	textColorPresets?: readonly string[];
	edgeColorPresets?: readonly string[];
	shadowColorPresets?: readonly string[];
};

const COLOR_PRESET_DEBOUNCE_MS = 300;

function TextStyleSettingsPanel({
	textItem,
	onScalePreviewChange,
	onScaleChange,
	onStylePreviewChange,
	onStyleChange,
	textColorPresets = EMPTY_COLOR_PRESETS,
	edgeColorPresets = EMPTY_COLOR_PRESETS,
	shadowColorPresets = EMPTY_COLOR_PRESETS,
}: TextStyleSettingsPanelProps) {
	// Force one extra render after mount: input fields capture parent context
	// during their first commit and otherwise leak re-renders into siblings.
	const [, forceRenderAfterOpen] = useReducer(
		(renderCount: number) => renderCount + 1,
		0,
	);
	useEffect(() => {
		const frameId = window.requestAnimationFrame(forceRenderAfterOpen);
		return () => window.cancelAnimationFrame(frameId);
	}, []);

	const resolvedStyle = useMemo(
		() => normalizeTextStyle(textItem.style),
		[textItem.style],
	);
	const scaleValue = useMemo(
		() => Math.round(clampScalePercent(textItem.scale ?? 100)),
		[textItem.scale],
	);
	const canEditStyle =
		typeof onStyleChange === 'function' ||
		typeof onStylePreviewChange === 'function';

	const { previewPatchTextStyle, commitPatchTextStyle } =
		useTextStylePanelPatchHandler({
			textItemId: textItem.id,
			resolvedStyle,
			onStylePreviewChange,
			onStyleChange,
		});

	const debouncedTextColors = useDebouncedValue(
		useStableReadonlyStringArray(textColorPresets),
		COLOR_PRESET_DEBOUNCE_MS,
	);
	const debouncedEdgeColors = useDebouncedValue(
		useStableReadonlyStringArray(edgeColorPresets),
		COLOR_PRESET_DEBOUNCE_MS,
	);
	const debouncedShadowColors = useDebouncedValue(
		useStableReadonlyStringArray(shadowColorPresets),
		COLOR_PRESET_DEBOUNCE_MS,
	);

	const [
		textColorPresetGroups,
		edgeColorPresetGroups,
		shadowColorPresetGroups,
	] = useMemo(
		() => [
			buildDraftTextColorPresetGroups('Text color', debouncedTextColors, [
				debouncedEdgeColors,
				debouncedShadowColors,
			]),
			buildDraftTextColorPresetGroups('Edge color', debouncedEdgeColors, [
				debouncedTextColors,
				debouncedShadowColors,
			]),
			buildDraftTextColorPresetGroups(
				'Shadow color',
				debouncedShadowColors,
				[debouncedTextColors, debouncedEdgeColors],
			),
		],
		[debouncedTextColors, debouncedEdgeColors, debouncedShadowColors],
	);

	return (
		<TextStylePanelFieldProvider
			canEditStyle={canEditStyle}
			patchTextStyle={commitPatchTextStyle}
			previewPatchTextStyle={previewPatchTextStyle}
		>
			<div className="px-4 pb-3 pt-1">
				<div className="flex flex-col gap-3">
					<div className="grid grid-cols-2 gap-2">
						<TextStyleToggleControls
							bold={resolvedStyle.bold}
							italic={resolvedStyle.italic}
							underline={resolvedStyle.underline}
							lineThrough={resolvedStyle.lineThrough}
						/>
						<TextAlignControls
							textAlign={resolvedStyle.textAlign}
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<NumberStyleField
							label="Letter spacing"
							value={resolvedStyle.letterSpacingPx}
							min={-8}
							max={40}
							precision={2}
							styleKey="letterSpacingPx"
							ariaLabel="Letter spacing"
						/>
						<NumberStyleField
							label="Line height"
							value={resolvedStyle.lineHeight}
							min={0.6}
							max={3}
							precision={2}
							styleKey="lineHeight"
							ariaLabel="Line height"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<ScaleStyleField
							textItemId={textItem.id}
							scaleValue={scaleValue}
							onScalePreviewChange={onScalePreviewChange}
							onScaleChange={onScaleChange}
						/>
						<OpacityStyleField opacity={resolvedStyle.opacity} />
					</div>

					<div className="grid grid-cols-2 gap-2">
						<FontFamilyStyleField
							fontFamily={resolvedStyle.fontFamily}
						/>
						<ColorStyleField
							label="Text color"
							value={resolvedStyle.color}
							styleKey="color"
							colorPresetGroups={textColorPresetGroups}
							ariaLabel="Text color"
						/>
					</div>

					<EdgeSection
						edgeEnabled={resolvedStyle.edgeEnabled}
						edgeWidthPx={resolvedStyle.edgeWidthPx}
						edgeColor={resolvedStyle.edgeColor}
						colorPresetGroups={edgeColorPresetGroups}
					/>
					<ShadowSection
						shadowEnabled={resolvedStyle.dropShadowEnabled}
						shadowColor={resolvedStyle.dropShadowColor}
						shadowBlurPx={resolvedStyle.dropShadowBlurPx}
						shadowOffsetXPx={resolvedStyle.dropShadowOffsetXPx}
						shadowOffsetYPx={resolvedStyle.dropShadowOffsetYPx}
						colorPresetGroups={shadowColorPresetGroups}
					/>
				</div>
			</div>
		</TextStylePanelFieldProvider>
	);
}

export default memo(TextStyleSettingsPanel, areTextStylePanelPropsEqual);
