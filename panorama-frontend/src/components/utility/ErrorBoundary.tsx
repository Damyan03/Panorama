import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

/**
 * Catches render-time errors below it and shows a fallback UI instead of
 * letting the entire app crash. Reset by remounting (e.g. via `key`).
 */
class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		// Surface the error to the host environment for log aggregation.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(
				new CustomEvent('app:error', { detail: { error, info } }),
			);
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-4">
						<h2 className="text-lg font-semibold text-text-primary">
							Something went wrong.
						</h2>
						<p className="text-text-muted mt-2">
							Please refresh the page or try again later.
						</p>
					</div>
				)
			);
		}
		return this.props.children;
	}
}

export default ErrorBoundary;
