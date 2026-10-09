import Modal from './Modal';

type Props = {
	open: boolean;
	title?: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmDialog({
	open,
	title = 'Confirm',
	message = 'Are you sure?',
	confirmLabel = 'Delete',
	cancelLabel = 'Cancel',
	loading = false,
	onConfirm,
	onCancel,
}: Props) {
	return (
		<Modal
			open={open}
			title={title}
			description={message}
			onClose={onCancel}
			className="max-w-md bg-bg-primary"
		>
			<div className="flex justify-end gap-3">
				<button
					type="button"
					onClick={onCancel}
					className="rounded border px-3 py-2 text-sm hover:bg-overlay-light-10"
					disabled={loading}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="rounded bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
					disabled={loading}
				>
					{loading ? 'Working…' : confirmLabel}
				</button>
			</div>
		</Modal>
	);
}
