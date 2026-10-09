import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export default function useElementSize<T extends Element>(
	ref: RefObject<T | null>,
) {
	const [rect, setRect] = useState<DOMRect | null>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const update = () => setRect(el.getBoundingClientRect());

		const ro = new ResizeObserver(() => update());
		ro.observe(el);

		// initial
		update();

		return () => ro.disconnect();
	}, [ref]);

	return rect;
}
