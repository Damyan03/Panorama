import type { TextHorizontalAlign, TextStyle } from '../../types/video';
import { areShallowEqualByKeys } from '../optimise/equality';

export type ResolvedTextStyle = {
	fontFamily: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	lineThrough: boolean;
	textAlign: TextHorizontalAlign;
	letterSpacingPx: number;
	lineHeight: number;
	opacity: number;
	color: string;
	edgeEnabled: boolean;
	edgeWidthPx: number;
	edgeColor: string;
	dropShadowEnabled: boolean;
	dropShadowColor: string;
	dropShadowBlurPx: number;
	dropShadowOffsetXPx: number;
	dropShadowOffsetYPx: number;
};

const RESOLVED_TEXT_STYLE_COMPARE_KEYS = [
	'fontFamily',
	'bold',
	'italic',
	'underline',
	'lineThrough',
	'textAlign',
	'letterSpacingPx',
	'lineHeight',
	'opacity',
	'color',
	'edgeEnabled',
	'edgeWidthPx',
	'edgeColor',
	'dropShadowEnabled',
	'dropShadowColor',
	'dropShadowBlurPx',
	'dropShadowOffsetXPx',
	'dropShadowOffsetYPx',
] as const satisfies readonly (keyof ResolvedTextStyle)[];

const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const DEFAULT_TEXT_STYLE: ResolvedTextStyle = {
	fontFamily: 'inherit',
	bold: false,
	italic: false,
	underline: false,
	lineThrough: false,
	textAlign: 'center',
	letterSpacingPx: 0,
	lineHeight: 1.2,
	opacity: 100,
	color: '#ffffff',
	edgeEnabled: false,
	edgeWidthPx: 2,
	edgeColor: '#000000',
	dropShadowEnabled: false,
	dropShadowColor: '#000000',
	dropShadowBlurPx: 6,
	dropShadowOffsetXPx: 1,
	dropShadowOffsetYPx: 1,
};

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown, fallback: number) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return fallback;
}

function toHexColor(value: unknown, fallback: string) {
	if (typeof value === 'string') {
		const nextValue = value.trim();
		if (HEX_COLOR_PATTERN.test(nextValue)) {
			return nextValue;
		}
	}

	return fallback;
}

function toTextAlign(
	value: unknown,
	fallback: TextHorizontalAlign,
): TextHorizontalAlign {
	if (value === 'left' || value === 'center' || value === 'right') {
		return value;
	}

	return fallback;
}

function toFontFamily(value: unknown, fallback: string) {
	if (typeof value !== 'string') {
		return fallback;
	}

	const nextValue = value.trim();
	return nextValue.length > 0 ? nextValue : fallback;
}

function toClampedInt(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
) {
	return Math.round(clamp(toFiniteNumber(value, fallback), min, max));
}

function toClampedFloat(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
	precision = 2,
) {
	return Number(
		clamp(toFiniteNumber(value, fallback), min, max).toFixed(precision),
	);
}

export function normalizeTextStyle(
	style: TextStyle | null | undefined,
): ResolvedTextStyle {
	const d = DEFAULT_TEXT_STYLE;
	return {
		fontFamily: toFontFamily(style?.fontFamily, d.fontFamily),
		bold: Boolean(style?.bold),
		italic: Boolean(style?.italic),
		underline: Boolean(style?.underline),
		lineThrough: Boolean(style?.lineThrough),
		textAlign: toTextAlign(style?.textAlign, d.textAlign),
		letterSpacingPx: toClampedFloat(
			style?.letterSpacingPx,
			d.letterSpacingPx,
			-8,
			40,
		),
		lineHeight: toClampedFloat(style?.lineHeight, d.lineHeight, 0.6, 3),
		opacity: toClampedInt(style?.opacity, d.opacity, 0, 100),
		color: toHexColor(style?.color, d.color),
		edgeEnabled: Boolean(style?.edgeEnabled),
		edgeWidthPx: toClampedFloat(style?.edgeWidthPx, d.edgeWidthPx, 0, 12),
		edgeColor: toHexColor(style?.edgeColor, d.edgeColor),
		dropShadowEnabled: Boolean(style?.dropShadowEnabled),
		dropShadowColor: toHexColor(style?.dropShadowColor, d.dropShadowColor),
		dropShadowBlurPx: toClampedFloat(
			style?.dropShadowBlurPx,
			d.dropShadowBlurPx,
			0,
			80,
		),
		dropShadowOffsetXPx: toClampedFloat(
			style?.dropShadowOffsetXPx,
			d.dropShadowOffsetXPx,
			-40,
			40,
		),
		dropShadowOffsetYPx: toClampedFloat(
			style?.dropShadowOffsetYPx,
			d.dropShadowOffsetYPx,
			-40,
			40,
		),
	};
}

export function areTextStylesEqual(
	leftStyle: TextStyle | null | undefined,
	rightStyle: TextStyle | null | undefined,
) {
	const left = normalizeTextStyle(leftStyle);
	const right = normalizeTextStyle(rightStyle);

	return areShallowEqualByKeys(left, right, RESOLVED_TEXT_STYLE_COMPARE_KEYS);
}

export function mergeTextStylePatch(
	style: TextStyle | null | undefined,
	patch: Partial<TextStyle>,
) {
	return normalizeTextStyle({ ...(style ?? undefined), ...patch });
}
