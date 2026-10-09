export type HslColor = {
	h: number;
	s: number;
	l: number;
};

export type HsvColor = {
	h: number;
	s: number;
	v: number;
};

export const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const DEFAULT_COLOR = '#000000';

export function clampNumber(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function expandShortHex(hex: string) {
	if (hex.length !== 4) {
		return hex;
	}

	return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
}

export function normalizeHexColor(value: string, fallback: string) {
	const trimmed = value.trim();
	const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

	if (!HEX_COLOR_PATTERN.test(prefixed)) {
		return fallback;
	}

	return prefixed.toLowerCase();
}

export function normalizePresetColor(value: string) {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return null;
	}

	const prefixed = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
	if (!HEX_COLOR_PATTERN.test(prefixed)) {
		return null;
	}

	const normalized = prefixed.toLowerCase();
	const expanded = expandShortHex(normalized);

	if (expanded.length === 9) {
		return expanded.slice(0, 7);
	}

	return expanded.length === 7 ? expanded : null;
}

export function toPickerHex(value: string, fallback = DEFAULT_COLOR) {
	const normalized = normalizeHexColor(value, fallback);
	const expanded = expandShortHex(normalized);

	if (expanded.length === 9) {
		return expanded.slice(0, 7);
	}

	return expanded.length === 7 ? expanded : fallback;
}

export function hexToRgb(hex: string) {
	const sixDigitHex = toPickerHex(hex).slice(1);

	return {
		r: Number.parseInt(sixDigitHex.slice(0, 2), 16),
		g: Number.parseInt(sixDigitHex.slice(2, 4), 16),
		b: Number.parseInt(sixDigitHex.slice(4, 6), 16),
	};
}

export function rgbToHex(r: number, g: number, b: number) {
	const toPart = (channel: number) => {
		return Math.round(clampNumber(channel, 0, 255))
			.toString(16)
			.padStart(2, '0');
	};

	return `#${toPart(r)}${toPart(g)}${toPart(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
	const red = clampNumber(r, 0, 255) / 255;
	const green = clampNumber(g, 0, 255) / 255;
	const blue = clampNumber(b, 0, 255) / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const delta = max - min;
	const lightness = (max + min) / 2;

	let hue = 0;
	if (delta !== 0) {
		if (max === red) {
			hue = ((green - blue) / delta) % 6;
		} else if (max === green) {
			hue = (blue - red) / delta + 2;
		} else {
			hue = (red - green) / delta + 4;
		}
		hue *= 60;
	}

	if (hue < 0) {
		hue += 360;
	}

	const saturation =
		delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

	return {
		h: Number(hue.toFixed(2)),
		s: Number((saturation * 100).toFixed(2)),
		l: Number((lightness * 100).toFixed(2)),
	};
}

export function hslToRgb(h: number, s: number, l: number) {
	const hue = (((h % 360) + 360) % 360) / 360;
	const saturation = clampNumber(s, 0, 100) / 100;
	const lightness = clampNumber(l, 0, 100) / 100;

	if (saturation === 0) {
		const gray = Math.round(lightness * 255);
		return { r: gray, g: gray, b: gray };
	}

	const q =
		lightness < 0.5
			? lightness * (1 + saturation)
			: lightness + saturation - lightness * saturation;
	const p = 2 * lightness - q;

	const hueToChannel = (t: number) => {
		let next = t;
		if (next < 0) {
			next += 1;
		}
		if (next > 1) {
			next -= 1;
		}

		if (next < 1 / 6) {
			return p + (q - p) * 6 * next;
		}
		if (next < 1 / 2) {
			return q;
		}
		if (next < 2 / 3) {
			return p + (q - p) * (2 / 3 - next) * 6;
		}

		return p;
	};

	return {
		r: Math.round(hueToChannel(hue + 1 / 3) * 255),
		g: Math.round(hueToChannel(hue) * 255),
		b: Math.round(hueToChannel(hue - 1 / 3) * 255),
	};
}

export function hslToHsv(hsl: HslColor): HsvColor {
	const saturation = clampNumber(hsl.s, 0, 100) / 100;
	const lightness = clampNumber(hsl.l, 0, 100) / 100;
	const value = lightness + saturation * Math.min(lightness, 1 - lightness);

	const hsvSaturation = value === 0 ? 0 : 2 * (1 - lightness / value);

	return {
		h: clampNumber(((hsl.h % 360) + 360) % 360, 0, 360),
		s: Number((clampNumber(hsvSaturation, 0, 1) * 100).toFixed(2)),
		v: Number((clampNumber(value, 0, 1) * 100).toFixed(2)),
	};
}

export function hsvToHsl(hsv: HsvColor): HslColor {
	const saturation = clampNumber(hsv.s, 0, 100) / 100;
	const value = clampNumber(hsv.v, 0, 100) / 100;
	const lightness = value * (1 - saturation / 2);

	const hslSaturation =
		lightness === 0 || lightness === 1
			? 0
			: (value - lightness) / Math.min(lightness, 1 - lightness);

	return {
		h: clampNumber(((hsv.h % 360) + 360) % 360, 0, 360),
		s: Number((clampNumber(hslSaturation, 0, 1) * 100).toFixed(2)),
		l: Number((clampNumber(lightness, 0, 1) * 100).toFixed(2)),
	};
}

export function hexToHsl(hex: string) {
	const { r, g, b } = hexToRgb(hex);
	return rgbToHsl(r, g, b);
}

export function hslToHex(hsl: HslColor) {
	const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
	return rgbToHex(r, g, b);
}

export function drawHslGradient(canvas: HTMLCanvasElement, hue: number) {
	const context = canvas.getContext('2d');
	if (!context) {
		return;
	}

	const { width, height } = canvas;
	if (width <= 0 || height <= 0) {
		return;
	}

	const xMax = Math.max(width - 1, 1);
	const yMax = Math.max(height - 1, 1);
	const imageData = context.createImageData(width, height);
	const data = imageData.data;

	for (let y = 0; y < height; y += 1) {
		const value = 100 - (y / yMax) * 100;

		for (let x = 0; x < width; x += 1) {
			const saturation = (x / xMax) * 100;
			const hsl = hsvToHsl({ h: hue, s: saturation, v: value });
			const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
			const index = (y * width + x) * 4;

			data[index] = r;
			data[index + 1] = g;
			data[index + 2] = b;
			data[index + 3] = 255;
		}
	}

	context.putImageData(imageData, 0, 0);
}
