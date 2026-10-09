import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import SearchInput from './SearchInput';
import ScreenReaderOnly from '../utility/ScreenReaderOnly';

type AppHeaderMobileProps = {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
};

function AppHeaderMobile({
	sidebarOpen,
	onToggleSidebar,
}: AppHeaderMobileProps) {
	const [searchOpen, setSearchOpen] = useState(false);

	return (
		<div className="flex h-full w-full items-center gap-3">
			<button
				type="button"
				aria-controls="sidebar"
				aria-expanded={sidebarOpen}
				aria-label="Toggle sidebar navigation"
				onClick={onToggleSidebar}
				className="btn btn-ghost btn-sm"
			>
				<div className="h-5 w-5" aria-hidden="true">
					<Icon name="menu" />
				</div>
				<ScreenReaderOnly>(Press M to toggle)</ScreenReaderOnly>
			</button>
			{!searchOpen && (
				<Link
					to="/"
					className="flex-1 text-center text-heading-lg"
					aria-label="Panorama Home"
				>
					<span className="text-primary">Pano</span>
					<span>rama</span>
				</Link>
			)}
			<nav
				aria-label="Secondary navigation"
				className={`flex items-center ${searchOpen ? 'flex-1 justify-center' : ''}`}
			>
				<SearchInput onOpenChange={setSearchOpen} />
			</nav>
		</div>
	);
}

export default AppHeaderMobile;
