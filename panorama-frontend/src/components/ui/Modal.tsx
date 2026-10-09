import { useEffect, useRef, type ReactNode } from 'react';
import Icon from '../Icon';
import ScreenReaderOnly from '../utility/ScreenReaderOnly';

type ModalProps = {
	open: boolean;
	title?: string;
	description?: string;
	children: ReactNode;
	onClose: () => void;
	className?: string;
};

export default function Modal({
	open,
	title,
	description,
	children,
	onClose,
	className = '',
}: ModalProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const announcementRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Announce modal opening to screen readers
		if (announcementRef.current) {
			announcementRef.current.textContent = `Dialog opened: ${title || 'Modal'} dialog. Press Escape to close or Tab to navigate.`;
		}

		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
				return;
			}

			if (event.key === 'Tab') {
				const root = containerRef.current;
				if (!root) return;
				const focusable = Array.from(
					root.querySelectorAll<HTMLElement>(
						'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]',
					),
				).filter((el) => el.offsetParent !== null);

				if (focusable.length === 0) {
					event.preventDefault();
					return;
				}

				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				const active = document.activeElement as HTMLElement | null;

				if (!event.shiftKey && active === last) {
					event.preventDefault();
					first.focus();
				} else if (event.shiftKey && active === first) {
					event.preventDefault();
					last.focus();
				}
			}
		};

		window.addEventListener('keydown', handleKey);

		// focus first focusable element inside the dialog
		setTimeout(() => {
			const root = containerRef.current;
			if (!root) return;
			const focusable = root.querySelector<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			(focusable ?? root).focus();
		}, 0);

		return () => {
			window.removeEventListener('keydown', handleKey);
			document.body.style.overflow = previousOverflow;
		};
	}, [open, onClose, title]);

	if (!open) return null;

	return (
		<>
			<div
				ref={announcementRef}
				className="sr-only"
				role="status"
				aria-live="polite"
				aria-atomic="true"
			/>
			<div
				className="overlay-modal"
				onClick={onClose}
				role="presentation"
			>
				<div
					ref={containerRef}
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
					aria-label={title}
					aria-describedby={
						description ? 'modal-description' : undefined
					}
					className={`card-modal relative w-full max-w-lg overflow-hidden ${className}`}
					onClick={(event) => event.stopPropagation()}
				>
					<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-primary-light to-success" />
					<div className="p-6 sm:p-8">
						{title && (
							<div className="flex items-center justify-between gap-4">
								<div>
									<h2 className="text-heading-md text-text-primary">
										{title}
									</h2>
									{description ? (
										<p
											id="modal-description"
											className="mt-3 max-w-md text-muted"
										>
											{description}
										</p>
									) : null}
								</div>
								<button
									type="button"
									onClick={onClose}
									className="btn btn-ghost w-10 aspect-square rounded-md text-text-primary"
									aria-label="Close dialog (Escape)"
								>
									<Icon name="close" className="" />
									<ScreenReaderOnly>Close</ScreenReaderOnly>
								</button>
							</div>
						)}

						{!title && description ? (
							<p
								id="modal-description"
								className="max-w-md text-muted"
							>
								{description}
							</p>
						) : null}

						<div className={title || description ? 'mt-6' : ''}>
							{children}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
