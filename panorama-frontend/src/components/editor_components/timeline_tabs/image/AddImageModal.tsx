import { memo, useState } from 'react';
import Modal from '../../../ui/Modal';
import { ColorInput } from '../../../ui/inputs';

const DEFAULT_SOLID_COLOR = '#000000';

type AddImageModalProps = {
	open: boolean;
	onClose: () => void;
	onAddSolidColor?: (color: string) => void;
	onUploadClick: () => void;
};

function AddImageModal({
	open,
	onClose,
	onAddSolidColor,
	onUploadClick,
}: AddImageModalProps) {
	const [solidColor, setSolidColor] = useState(DEFAULT_SOLID_COLOR);

	function handleAddSolidColor() {
		onAddSolidColor?.(solidColor);
		onClose();
	}

	function handleUploadClick() {
		onClose();
		onUploadClick();
	}

	return (
		<Modal open={open} title="Add Image" onClose={onClose}>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3">
					<span className="text-xs font-medium uppercase tracking-wide text-text-muted block mb-3">
						Upload image
					</span>
					<button
						type="button"
						onClick={handleUploadClick}
						className="btn btn-secondary w-full"
					>
						Upload
					</button>
				</div>
				<div className="border-t border-border pt-4 flex flex-col gap-3">
					<span className="text-xs font-medium uppercase tracking-wide text-text-muted">
						Solid color
					</span>
					<ColorInput
						value={solidColor}
						onChangeValue={setSolidColor}
						onCommit={setSolidColor}
						ariaLabel="Solid color"
						className="h-10"
					/>
					<button
						type="button"
						onClick={handleAddSolidColor}
						className="btn btn-primary w-full"
					>
						Add
					</button>
				</div>
			</div>
		</Modal>
	);
}

export default memo(AddImageModal);
