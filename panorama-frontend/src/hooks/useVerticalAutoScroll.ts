import { useCallback, type RefObject } from 'react';

type UseVerticalAutoScrollOptions = {
	edgeThresholdPx?: number;
	maxStepPx?: number;
};

function useVerticalAutoScroll(
	containerRef: RefObject<HTMLElement | null>,
	{ edgeThresholdPx = 36, maxStepPx = 15 }: UseVerticalAutoScrollOptions = {},
) {
	return useCallback(
		(clientY: number) => {
			const container = containerRef.current;
			if (!container) {
				return;
			}

			const rect = container.getBoundingClientRect();
			const topDistance = clientY - rect.top;
			const bottomDistance = rect.bottom - clientY;

			let deltaY = 0;
			if (topDistance < edgeThresholdPx) {
				const intensity = Math.min(
					1,
					(edgeThresholdPx - topDistance) / edgeThresholdPx,
				);
				deltaY = -maxStepPx * intensity;
			} else if (bottomDistance < edgeThresholdPx) {
				const intensity = Math.min(
					1,
					(edgeThresholdPx - bottomDistance) / edgeThresholdPx,
				);
				deltaY = maxStepPx * intensity;
			}

			if (deltaY === 0) {
				return;
			}

			const maxScrollTop =
				container.scrollHeight - container.clientHeight;
			if (maxScrollTop <= 0) {
				return;
			}

			const nextScrollTop = Math.min(
				maxScrollTop,
				Math.max(0, container.scrollTop + deltaY),
			);

			if (nextScrollTop !== container.scrollTop) {
				container.scrollTop = nextScrollTop;
			}
		},
		[containerRef, edgeThresholdPx, maxStepPx],
	);
}

export default useVerticalAutoScroll;
