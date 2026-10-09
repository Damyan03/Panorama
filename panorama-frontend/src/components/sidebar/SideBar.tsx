import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import SideNavDesktop from './SideNavDesktop';
import SideNavMobile from './SideNavMobile';

function SideNav({
	onClose,
	isDesktop = false,
}: {
	onClose: () => void;
	isDesktop?: boolean;
}) {
	const { user, isAuthenticated, logout } = useAuth();
	const [showCreateVideoPrompt, setShowCreateVideoPrompt] = useState(false);
	const [showInformationLinks, setShowInformationLinks] = useState(false);

	const toggleInformationLinks = useCallback(() => {
		setShowInformationLinks((prev) => !prev);
	}, []);

	return isDesktop ? (
		<SideNavDesktop
			onClose={onClose}
			isAuthenticated={isAuthenticated}
			displayName={user?.displayName}
			labels={user?.labels}
			role={user?.role}
			logout={logout}
			showCreateVideoPrompt={showCreateVideoPrompt}
			setShowCreateVideoPrompt={setShowCreateVideoPrompt}
			showInformationLinks={showInformationLinks}
			toggleInformationLinks={toggleInformationLinks}
		/>
	) : (
		<SideNavMobile
			onClose={onClose}
			isAuthenticated={isAuthenticated}
			displayName={user?.displayName}
			labels={user?.labels}
			role={user?.role}
			logout={logout}
			showCreateVideoPrompt={showCreateVideoPrompt}
			setShowCreateVideoPrompt={setShowCreateVideoPrompt}
			showInformationLinks={showInformationLinks}
			toggleInformationLinks={toggleInformationLinks}
		/>
	);
}

export default SideNav;
