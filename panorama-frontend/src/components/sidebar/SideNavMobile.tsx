import { Link } from 'react-router-dom';
import { CreateVideoLoginPrompt } from '../modals';
import ScreenReaderOnly from '../utility/ScreenReaderOnly';
import SideNavBody from './SideNavBody';
import SideNavFooter from './SideNavFooter';

type SideNavMobileProps = {
	onClose: () => void;
	isAuthenticated: boolean;
	displayName?: string;
	labels?: string[];
	role?: string;
	logout: () => void;
	showCreateVideoPrompt: boolean;
	setShowCreateVideoPrompt: (open: boolean) => void;
	showInformationLinks: boolean;
	toggleInformationLinks: () => void;
};

function SideNavMobile({
	onClose,
	isAuthenticated,
	displayName,
	labels,
	role,
	logout,
	showCreateVideoPrompt,
	setShowCreateVideoPrompt,
	showInformationLinks,
	toggleInformationLinks,
}: SideNavMobileProps) {
	return (
		<>
			<nav
				id="sidebar"
				className="fixed left-0 top-0 z-40 flex h-screen w-88 flex-col overflow-y-auto border-r border-border bg-bg-main/95 px-4 pb-4 text-text-primary shadow-2xl backdrop-blur-sm"
				aria-label="Main navigation"
			>
				<div className="sticky top-0 z-10 flex h-18 items-center justify-between gap-4 bg-bg-main/90 backdrop-blur-sm">
					<Link
						to="/"
						className="flex-1 text-2xl font-bold tracking-tight"
						aria-label="Panorama Home"
					>
						Panorama
					</Link>
					<button
						type="button"
						aria-label="Close navigation menu (Escape)"
						onClick={onClose}
						className="btn btn-ghost h-10 w-10 px-0"
					>
						<ScreenReaderOnly>Close</ScreenReaderOnly>×
					</button>
				</div>

				<SideNavBody
					isAuthenticated={isAuthenticated}
					displayName={displayName}
					labels={labels}
					role={role}
					onClose={onClose}
					logout={logout}
					onOpenCreateVideoPrompt={() => setShowCreateVideoPrompt(true)}
					showInformationLinks={showInformationLinks}
					toggleInformationLinks={toggleInformationLinks}
				/>

				<SideNavFooter />
			</nav>

			<CreateVideoLoginPrompt
				open={showCreateVideoPrompt}
				onClose={() => setShowCreateVideoPrompt(false)}
			/>
		</>
	);
}

export default SideNavMobile;
