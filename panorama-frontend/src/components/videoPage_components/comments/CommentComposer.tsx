import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent } from 'react';

type Props = {
	value: string;
	onChange: (value: string) => void;
	onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	placeholder: string;
	disabled: boolean;
};

export default function CommentComposer({
	value,
	onChange,
	onPaste,
	onSubmit,
	placeholder,
	disabled,
}: Props) {
	const [expanded, setExpanded] = useState(false);
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	const handleFocus = useCallback(() => {
		setExpanded(true);
	}, []);

	// Collapse when clicking outside and there's no text
	useEffect(() => {
		function onPointerDown(e: PointerEvent) {
			if (!wrapperRef.current) return;
			if (wrapperRef.current.contains(e.target as Node)) return;
			if (value.trim().length === 0) setExpanded(false);
		}

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape' && value.trim().length === 0) {
				setExpanded(false);
			}
		}

		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [value]);

	return (
		<div ref={wrapperRef}>
			{!expanded ? (
				<div
					className="card p-2 flex items-center"
					onClick={handleFocus}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							setExpanded(true);
						}
					}}
				>
					<textarea
						value={value}
						onChange={(event) => onChange(event.target.value)}
						onPaste={onPaste}
						placeholder={placeholder}
						disabled={disabled}
						className="input h-10 resize-none overflow-hidden"
						rows={1}
						readOnly
					/>
				</div>
			) : (
				<form
					onSubmit={onSubmit}
					className="card flex flex-col gap-3 p-4"
				>
					<textarea
						autoFocus
						value={value}
						onChange={(event) => onChange(event.target.value)}
						onPaste={onPaste}
						placeholder={placeholder}
						maxLength={2000}
						disabled={disabled}
						className="input min-h-24 resize-y"
					/>
					<div className="flex items-center justify-end gap-3">
						<div className="flex items-center gap-2">
							<button
								type="submit"
								disabled={disabled || value.trim().length === 0}
								className="btn btn-primary btn-sm"
							>
								Post comment
							</button>
						</div>
					</div>
				</form>
			)}
		</div>
	);
}
