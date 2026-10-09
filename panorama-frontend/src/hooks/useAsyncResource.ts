import { useEffect, useState } from 'react';

interface AsyncResourceState<T> {
	data: T | null;
	isLoading: boolean;
	error: unknown;
}

/**
 * Run an async loader and track its state, automatically ignoring updates from
 * stale calls when `deps` change or the component unmounts.
 *
 * @example
 * const { data, isLoading } = useAsyncResource(() => getVideo(slug), [slug]);
 */
export function useAsyncResource<T>(
	loader: () => Promise<T>,
	deps: React.DependencyList,
): AsyncResourceState<T> {
	const [state, setState] = useState<AsyncResourceState<T>>({
		data: null,
		isLoading: true,
		error: null,
	});

	useEffect(() => {
		let active = true;
		setState({ data: null, isLoading: true, error: null });

		loader()
			.then((data) => {
				if (active) setState({ data, isLoading: false, error: null });
			})
			.catch((error: unknown) => {
				if (active) setState({ data: null, isLoading: false, error });
			});

		return () => {
			active = false;
		};
		// loader identity is intentionally not tracked; callers control invalidation via `deps`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	return state;
}
