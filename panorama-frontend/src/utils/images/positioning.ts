/**
 * Shared image positioning logic for editor preview and live video rendering.
 * Ensures consistent positioning and scaling math across both components.
 */

export interface Size {
	width: number;
	height: number;
}

export interface Position {
	left: number;
	top: number;
}

export interface TransformResult {
	translateX: number;
	translateY: number;
	overflow: {
		x: number;
		y: number;
	};
	centerOffset: {
		x: number;
		y: number;
	};
}

/**
 * Calculates image translation for positioning within a container.
 *
 * When image is larger than container: overflow scrolls via position percent
 * When image is smaller: it centers and the sliders move it within the centered gap
 *
 * @param basePosition - Base position in percent (0-100), where 50,50 is center
 * @param containerSize - Dimensions of the container the image is positioned in
 * @param imageSize - Actual rendered dimensions of the image
 * @param viewportOffset - Offset of the visible viewport within container (default 0,0)
 * @returns Transform result with translate values and computed metrics
 */
export function calculateImageTransform(
	basePosition: Position,
	containerSize: Size,
	imageSize: Size,
	viewportOffset: Position = { left: 0, top: 0 },
): TransformResult {
	const { width: containerW, height: containerH } = containerSize;
	const { width: imageW, height: imageH } = imageSize;

	// When image larger than container: overflow is scrollable space
	const overflowX = Math.max(0, imageW - containerW);
	const overflowY = Math.max(0, imageH - containerH);

	// When image smaller than container: center it
	const centerOffsetX = Math.max(0, (containerW - imageW) / 2);
	const centerOffsetY = Math.max(0, (containerH - imageH) / 2);

	// Effective range: use overflow if image is larger, else use centered gap so sliders still move it
	const scrollRangeX = Math.max(overflowX, centerOffsetX * 2);
	const scrollRangeY = Math.max(overflowY, centerOffsetY * 2);

	// Position: convert percent (0-100) to pixel offset within the range.
	// X is always inverted so 0% = left and 100% = right.
	// Y is inverted only when the image fully fits inside the frame.
	const positionRatioX = (100 - basePosition.left) / 100;
	const positionRatioY =
		overflowY > 0 ? basePosition.top / 100 : (100 - basePosition.top) / 100;

	// Translation with direction based on overflow vs centering:
	// - Large images (overflow): move in negative direction as slider goes forward to reveal end
	// - Small images (centered): move in positive direction as slider goes forward
	// - For X: positionRatioX is inverted (1 at left, 0 at right), so use (1 - positionRatioX)
	// - For Y: use the overflow path normally, but invert the value when the image is contained
	const scrollDirectionX = overflowX > 0 ? -1 : 1;
	const scrollDirectionY = overflowY > 0 ? -1 : 1;

	const translateX =
		viewportOffset.left +
		scrollDirectionX * scrollRangeX * (1 - positionRatioX);
	const translateY =
		viewportOffset.top + scrollDirectionY * scrollRangeY * positionRatioY;

	return {
		translateX,
		translateY,
		overflow: { x: overflowX, y: overflowY },
		centerOffset: { x: centerOffsetX, y: centerOffsetY },
	};
}
