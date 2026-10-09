import { Link } from 'react-router-dom';
import SidebarLink from './SidebarLink';
import SidebarButton from './SidebarButton';
import UserCard from './UserCard';
import SidebarSection from './SidebarSection';
import FollowingList from './FollowingList';

type SideNavBodyProps = {
	isAuthenticated: boolean;
	displayName?: string;
	labels?: string[];
	role?: string;
	onClose: () => void;
	logout: () => void;
	onOpenCreateVideoPrompt: () => void;
	showInformationLinks: boolean;
	toggleInformationLinks: () => void;
};

function SideNavBody({
	isAuthenticated,
	displayName,
	labels,
	role,
	onClose,
	logout,
	onOpenCreateVideoPrompt,
	showInformationLinks,
	toggleInformationLinks,
}: SideNavBodyProps) {
	return (
		<div className="flex flex-1 flex-col justify-between gap-5">
			<UserCard
				isAuthenticated={isAuthenticated}
				displayName={displayName}
				labels={labels}
				role={role}
				onClose={onClose}
			/>

			<SidebarSection flex>
				<SidebarLink to="/wheel" onClick={onClose}>
					Wheel of Fortune
				</SidebarLink>

				<div className="card flex-center h-15 px-4 text-text-secondary">
					Video roulette
				</div>

				{isAuthenticated && (
					<SidebarLink
						to="/editor/library"
						onClick={onClose}
						aria-label="My Draft Library"
					>
						My Draft library
					</SidebarLink>
				)}

				{!isAuthenticated && (
					<SidebarButton
						variant="primary"
						onClick={onOpenCreateVideoPrompt}
						aria-label="Create a new video (login required)"
					>
						Create a video
					</SidebarButton>
				)}

				{isAuthenticated && <FollowingList onClose={onClose} />}
			</SidebarSection>

			<SidebarSection>
				<div className="card flex-center h-15 px-4 text-text-secondary">
					Show your support
				</div>
				<div className="card flex-center h-15 px-4 text-text-secondary">
					Language
				</div>
				<div className="card overflow-hidden">
					<button
						type="button"
						onClick={toggleInformationLinks}
						aria-expanded={showInformationLinks}
						aria-label="Information links menu"
						className="relative h-15 w-full px-4 text-text-secondary transition hover:bg-bg-elevated"
					>
						<span className="flex-1 text-center">Information</span>
						<span
							className={`absolute right-6 top-1/2 -translate-y-1/2 text-xs transition-transform ${showInformationLinks ? 'rotate-180' : ''}`}
							aria-hidden="true"
						>
							v
						</span>
					</button>

					{showInformationLinks && (
						<div
							className="flex flex-col gap-2 border-t border-border p-4 pt-3"
							role="region"
							aria-label="Information links"
						>
							<Link
								to="/terms"
								onClick={onClose}
								className="text-body link-subtle"
								aria-label="Terms of Service"
							>
								Terms of service
							</Link>
							<Link
								to="/privacy"
								onClick={onClose}
								className="text-body link-subtle"
								aria-label="Privacy Policy"
							>
								Privacy policy
							</Link>
							<Link
								to="/dmca"
								onClick={onClose}
								className="text-body link-subtle"
								aria-label="DMCA Policy"
							>
								DMCA
							</Link>
						</div>
					)}
				</div>

				{isAuthenticated && (
					<SidebarButton
						variant="default"
						onClick={logout}
						aria-label="Logout from your account"
					>
						Logout
					</SidebarButton>
				)}
			</SidebarSection>
		</div>
	);
}

export default SideNavBody;
