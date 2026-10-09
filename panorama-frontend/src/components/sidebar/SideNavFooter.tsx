/**
 * Shared footer component for sidebar navigation.
 * Reused in both desktop and mobile layouts.
 */
export default function SideNavFooter() {
	return (
		<footer className="border-t border-border pt-4">
			<div className="w-full text-center text-label-md">
				Panorama Copyright 2026
			</div>
			<div className="w-full text-center text-muted">
				All rights reserved
			</div>
		</footer>
	);
}
