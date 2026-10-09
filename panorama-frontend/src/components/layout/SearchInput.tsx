import {
	useEffect,
	useRef,
	useState,
	type FormEvent,
	type KeyboardEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../Icon';

type SearchInputProps = {
	placeholder?: string;
	ariaLabel?: string;
	className?: string;
	alwaysVisible?: boolean;
	onSearch?: (value: string) => void;
	onOpenChange?: (isOpen: boolean) => void;
};

function SearchInput({
	placeholder = 'Search videos',
	ariaLabel = 'Search videos',
	className = '',
	alwaysVisible = false,
	onSearch,
	onOpenChange,
}: SearchInputProps) {
	const location = useLocation();
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);
	const [value, setValue] = useState(() => {
		const params = new URLSearchParams(location.search);
		return params.get('q')?.trim() ?? '';
	});
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (isOpen) {
			window.requestAnimationFrame(() => {
				inputRef.current?.focus();
			});
		}
		onOpenChange?.(isOpen);
	}, [isOpen, onOpenChange]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		setValue(params.get('q')?.trim() ?? '');
	}, [location.search]);

	function handleToggle() {
		setIsOpen(true);
	}

	function handleBlur() {
		if (!value.trim()) {
			setIsOpen(false);
		}
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const query = value.trim();

		onSearch?.(query);
		if (onSearch) {
			return;
		}

		const params = new URLSearchParams();
		if (query) {
			params.set('q', query);
		}

		navigate({
			pathname: '/',
			search: params.toString() ? `?${params.toString()}` : '',
		});

		if (!alwaysVisible) {
			setIsOpen(false);
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Escape') {
			setIsOpen(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className={`flex items-center gap-2 ${className}`}
		>
			{alwaysVisible ? (
				<div className="flex w-full items-center gap-2 rounded-full border border-overlay-light-10 bg-bg-main p-1 pl-3 shadow-sm">
					<div className="h-4 aspect-square">
						<Icon name="search" className="text-text-muted" />
					</div>
					<input
						ref={inputRef}
						type="search"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						placeholder={placeholder}
						aria-label={ariaLabel}
						className="h-9 w-full min-w-0 bg-transparent px-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
					/>
				</div>
			) : !isOpen ? (
				<button
					type="button"
					className="flex-center w-8 text-text-primary transition hover:text-primary"
					aria-label={ariaLabel}
					onClick={handleToggle}
				>
					<Icon name="search" />
				</button>
			) : (
				<div className="overflow-hidden max-w-[16rem] opacity-100 transition-all duration-200 ease-out p-1">
					<input
						ref={inputRef}
						type="search"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						aria-label={ariaLabel}
						className="h-10 w-64 min-w-0 rounded-full border border-overlay-light-10 bg-bg-main px-4 text-sm text-text-primary outline-none ring-0 placeholder:text-text-muted focus:border-primary/40 focus:ring-2 focus:ring-focus-ring"
					/>
				</div>
			)}
		</form>
	);
}

export default SearchInput;
