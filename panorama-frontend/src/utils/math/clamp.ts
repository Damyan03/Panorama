import {
	EDITOR_MAX_SCALE,
	EDITOR_TEXT_DEFAULT_WIDTH_PERCENT,
	EDITOR_TEXT_MAX_WIDTH_PERCENT,
	EDITOR_TEXT_MIN_WIDTH_PERCENT,
} from '../../constants/ui';

export function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export function clampPercent(value: number) {
	return clamp(value, 0, 100);
}

export function clampSignedPercent(value: number) {
	return clamp(value, -100, 100);
}

export function clampScalePercent(value: number) {
	return clamp(value, 0, EDITOR_MAX_SCALE);
}

export function clampWidthPercent(value: number) {
	if (!Number.isFinite(value)) {
		return EDITOR_TEXT_DEFAULT_WIDTH_PERCENT;
	}

	return clamp(
		value,
		EDITOR_TEXT_MIN_WIDTH_PERCENT,
		EDITOR_TEXT_MAX_WIDTH_PERCENT,
	);
}

export function toClampedPercent(
	value: number | string,
	fallback: number,
	min: number,
	max: number,
) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return clamp(value, min, max);
	}

	const parsed = Number.parseFloat(String(value));
	if (Number.isFinite(parsed)) {
		return clamp(parsed, min, max);
	}

	return clamp(fallback, min, max);
}
