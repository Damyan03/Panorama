import { useEffect } from 'react';

type ToastType = 'info' | 'success' | 'error';

export type ToastItem = {
	id: string;
	message: string;
	type?: ToastType;
};

export default function Toast({
	item,
	onClose,
}: {
	item: ToastItem;
	onClose: () => void;
}) {
	useEffect(() => {
		const t = setTimeout(onClose, 4000);
		return () => clearTimeout(t);
	}, [onClose]);

	const bg =
		item.type === 'success'
			? 'bg-green-600'
			: item.type === 'error'
				? 'bg-red-600'
				: 'bg-gray-800';

	return (
		<div
			className={`max-w-xs w-full ${bg} text-white rounded-lg shadow-lg p-3 mb-3`}
			role="status"
		>
			<div className="text-sm">{item.message}</div>
		</div>
	);
}
