import { memo } from 'react';
import AppHeaderDesktop from './AppHeaderDesktop';
import AppHeaderMobile from './AppHeaderMobile';

const AppHeader = memo(function AppHeader({
	sidebarOpen,
	onToggleSidebar,
	isDesktop = false,
}: {
	sidebarOpen: boolean;
	onToggleSidebar: () => void;
	isDesktop?: boolean;
}) {
	return (
		<header className="fixed top-0 z-20 h-16 w-full border-b border-overlay-light-10 bg-bg-secondary/95 px-4 text-text-primary backdrop-blur-sm">
			{isDesktop ? (
				<AppHeaderDesktop />
			) : (
				<AppHeaderMobile
					sidebarOpen={sidebarOpen}
					onToggleSidebar={onToggleSidebar}
				/>
			)}
		</header>
	);
});

export default AppHeader;
