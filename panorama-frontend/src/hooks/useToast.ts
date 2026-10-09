import { useCallback } from 'react';
import { useToastContext } from '../components/ui/ToastProvider';

export default function useToast() {
	const { showToast } = useToastContext();

	const info = useCallback(
		(msg: string) => showToast(msg, 'info'),
		[showToast],
	);
	const success = useCallback(
		(msg: string) => showToast(msg, 'success'),
		[showToast],
	);
	const error = useCallback(
		(msg: string) => showToast(msg, 'error'),
		[showToast],
	);

	return { showToast, info, success, error };
}
