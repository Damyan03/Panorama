import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from 'react';
import type { ReactNode } from 'react';
import Toast, { type ToastItem } from './Toast';

type ShowToast = (message: string, type?: ToastItem['type']) => void;

const ToastContext = createContext<{ showToast: ShowToast } | undefined>(
	undefined,
);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ToastItem[]>([]);

	const remove = useCallback((id: string) => {
		setItems((s) => s.filter((t) => t.id !== id));
	}, []);

	const showToast: ShowToast = useCallback(
		(message: string, type: ToastItem['type'] = 'info') => {
			const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
			const item: ToastItem = { id, message, type };
			setItems((s) => [item, ...s]);
			// auto remove after a little longer than visual timeout (fallback)
			setTimeout(() => remove(id), 4500);
		},
		[remove],
	);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<div className="fixed right-4 bottom-6 z-60 flex flex-col items-end">
				{items.map((it) => (
					<div key={it.id}>
						<Toast item={it} onClose={() => remove(it.id)} />
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
}

export function useToastContext() {
	const ctx = useContext(ToastContext);
	if (!ctx)
		throw new Error('useToastContext must be used within a ToastProvider');
	return ctx;
}
