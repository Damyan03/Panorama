import { CreateVideoLoginPrompt } from '../modals';
import SideNavBody from './SideNavBody';
import SideNavFooter from './SideNavFooter';

type SideNavDesktopProps = {
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

function SideNavDesktop({
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
}: SideNavDesktopProps) {
	return (
		<>
			<nav
				id="sidebar"
				className="sticky top-16 z-40 flex h-[calc(100vh-4rem)] w-88 shrink-0 flex-col overflow-y-auto border-r border-border bg-bg-main/95 p-4 text-text-primary shadow-none backdrop-blur-sm"
				aria-label="Main navigation"
			>
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

export default SideNavDesktop;
