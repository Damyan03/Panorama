import { memo, useEffect, useRef } from 'react';
import {
	clampNumber,
	drawHslGradient,
	hslToHex,
	hslToHsv,
} from '../../../utils/color';

type HslGradientCanvasProps = {
	hue: number;
	saturation: number;
	lightness: number;
	width: number;
	height: number;
};

function HslGradientCanvas({
	hue,
	saturation,
	lightness,
	width,
	height,
}: HslGradientCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}

		drawHslGradient(canvas, hue);
	}, [hue]);

	const hsvColor = hslToHsv({
		h: hue,
		s: saturation,
		l: lightness,
	});
	const saturationThumbLeft = `${clampNumber(hsvColor.s, 0, 100)}%`;
	const lightnessThumbTop = `${100 - clampNumber(hsvColor.v, 0, 100)}%`;

	return (
		<>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				className="h-full w-full rounded"
			/>
			<div
				className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.75)]"
				style={{
					left: saturationThumbLeft,
					top: lightnessThumbTop,
					backgroundColor: hslToHex({
						h: hue,
						s: saturation,
						l: lightness,
					}),
				}}
			/>
		</>
	);
}

export default memo(HslGradientCanvas);
