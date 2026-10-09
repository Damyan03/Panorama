import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import ScreenReaderOnly from '../utility/ScreenReaderOnly';

type Item = {
	id?: string | number;
	label: string;
	onClick: () => void;
	destructive?: boolean;
};

export default function DotsDropdown({ items }: { items: Item[] }) {
	const [open, setOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

	const toggle = useCallback(() => setOpen((v) => !v), []);
	const close = useCallback(() => {
		setOpen(false);
		setFocusedIndex(-1);
	}, []);

	useEffect(() => {
		function onDoc(e: Event) {
			if (!rootRef.current) return;
			if (
				e.target instanceof Node &&
				!rootRef.current.contains(e.target)
			) {
				close();
			}
		}

		function onKey(e: KeyboardEvent) {
			if (!open) return;

			if (e.key === 'Escape') {
				e.preventDefault();
				close();
				return;
			}

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setFocusedIndex((prev) =>
					prev < items.length - 1 ? prev + 1 : 0,
				);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setFocusedIndex((prev) =>
					prev > 0 ? prev - 1 : items.length - 1,
				);
			} else if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				if (focusedIndex >= 0) {
					itemsRef.current[focusedIndex]?.click();
				}
			}
		}

		document.addEventListener('mousedown', onDoc);
		document.addEventListener('touchstart', onDoc);
		document.addEventListener('keydown', onKey);

		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('touchstart', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, focusedIndex, items.length, close]);

	// Focus management
	useEffect(() => {
		if (focusedIndex >= 0 && itemsRef.current[focusedIndex]) {
			itemsRef.current[focusedIndex]?.focus();
		}
	}, [focusedIndex]);

	return (
		<div ref={rootRef} className="relative inline-block text-left">
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={toggle}
				className="rounded-full p-2 text-text-primary hover:bg-overlay-light-10"
				aria-label="Open menu (arrow keys to navigate, Enter to select)"
			>
				<ScreenReaderOnly>Open menu</ScreenReaderOnly>
				<div className="w-6 h-6" aria-hidden="true">
					<Icon name="dotsVertical" />
				</div>
			</button>

			{open ? (
				<div
					className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-bg-main shadow-lg z-50"
					role="menu"
				>
					<ul className="py-2" role="none">
						{items.map((it, idx) => (
							<li key={it.id ?? `${it.label}-${idx}`} role="none">
								<button
									ref={(el) => {
										itemsRef.current[idx] = el;
									}}
									type="button"
									role="menuitem"
									onClick={() => {
										try {
											it.onClick();
										} finally {
											close();
										}
									}}
									onMouseEnter={() => setFocusedIndex(idx)}
									className={`w-full text-left px-4 py-2 text-sm transition ${
										focusedIndex === idx
											? 'bg-overlay-light-10'
											: ''
									} ${it.destructive ? 'text-red-500' : 'text-text-primary'} hover:bg-overlay-light-10`}
									aria-label={it.label}
								>
									{it.label}
								</button>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
