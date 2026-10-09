import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from 'react-router-dom';
import { AppHeader } from './components/layout';

import { SideNav } from './components/sidebar';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/ui';
import SkipLinks from './components/utility/SkipLinks';
import ErrorBoundary from './components/utility/ErrorBoundary';
import { useIsDesktop } from './hooks';
import { AuthFormModal } from './components/modals';
import { getReturnToPath, type AuthRouteState } from './auth/routeState';

// Route-level code splitting keeps the initial bundle small; heavy editor /
// player code is only fetched when the corresponding URL is visited.
const HomePage = lazy(() => import('./pages/homePage.tsx'));
const VideoPage = lazy(() => import('./pages/videoPage.tsx'));
const WheelPage = lazy(() => import('./pages/wheelPage.tsx'));
const EditorPage = lazy(() => import('./pages/editorPage.tsx'));
const EditorLibraryPage = lazy(() => import('./pages/editorLibraryPage.tsx'));
const TermsPage = lazy(() => import('./pages/termsPage.tsx'));
const PrivacyPage = lazy(() => import('./pages/privacyPage.tsx'));
const DmcaPage = lazy(() => import('./pages/dmcaPage.tsx'));
const ProfilePage = lazy(() => import('./pages/profilePage.tsx'));
const SettingsPage = lazy(() => import('./pages/settingsPage.tsx'));

function AppRoutes() {
	const { isReady } = useAuth();

	if (!isReady) {
		return (
			<div className="min-h-screen bg-bg-main text-text-primary flex items-center justify-center">
				<div className="text-text-muted">Restoring session...</div>
			</div>
		);
	}

	return <AppShell />;
}

function AppShell() {
	const location = useLocation();
	const isDesktop = useIsDesktop();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const authState = location.state as AuthRouteState | null;
	const isAuthRoute =
		location.pathname === '/login' || location.pathname === '/register';
	const isEditorRoute = location.pathname.startsWith('/editor');
	const backgroundLocation = authState?.backgroundLocation;
	const displayLocation =
		backgroundLocation ??
		(isAuthRoute
			? ({
					pathname: '/',
					search: '',
					hash: '',
					state: null,
					key: 'auth',
				} as const)
			: location);
	const returnTo = getReturnToPath(authState);

	// Automatically open sidebar on desktop
	useEffect(() => {
		setSidebarOpen(isDesktop);
	}, [isDesktop]);

	const handleToggleSidebar = useCallback(() => {
		setSidebarOpen((open) => !open);
	}, []);

	return (
		<>
			<SkipLinks />
			<AppHeader
				sidebarOpen={sidebarOpen}
				onToggleSidebar={handleToggleSidebar}
				isDesktop={isDesktop}
			/>
			<div className="pt-16">
				<div
					className={
						isDesktop ? 'md:flex md:h-[calc(100dvh-4rem)]' : ''
					}
				>
					{isDesktop ? (
						<SideNav onClose={handleToggleSidebar} isDesktop />
					) : (
						sidebarOpen && (
							<>
								<button
									type="button"
									aria-label="Close sidebar"
									onClick={handleToggleSidebar}
									className="fixed inset-0 z-30 bg-overlay-dark-50"
								/>
								<SideNav
									onClose={handleToggleSidebar}
									isDesktop={false}
								/>
							</>
						)
					)}
					<main
						id="main-content"
						className={[
							'bg-bg-main text-text-primary',
							isEditorRoute
								? 'h-[calc(100dvh-4rem)] overflow-hidden'
								: 'min-h-[calc(100dvh-4rem)]',
							isDesktop
								? `flex-1 min-w-0 ${isEditorRoute ? '' : 'md:overflow-y-auto'}`
								: 'w-full',
							sidebarOpen && !isDesktop ? 'overflow-hidden' : '',
						]
							.filter(Boolean)
							.join(' ')}
						role="main"
					>
						<ErrorBoundary>
							<Suspense
								fallback={
									<div className="flex items-center justify-center py-16 text-text-muted">
										Loading...
									</div>
								}
							>
								<Routes location={displayLocation}>
									<Route path="/" element={<HomePage />} />
									<Route
										path="/wheel"
										element={<WheelPage />}
									/>
									<Route
										path="/video/:slug"
										element={<VideoPage />}
									/>
									<Route
										path="/editor"
										element={<EditorPage />}
									/>
									<Route
										path="/editor/:slug"
										element={<EditorPage />}
									/>
									<Route
										path="/editor/library"
										element={<EditorLibraryPage />}
									/>
									<Route
										path="/terms"
										element={<TermsPage />}
									/>
									<Route
										path="/privacy"
										element={<PrivacyPage />}
									/>
									<Route
										path="/dmca"
										element={<DmcaPage />}
									/>
									<Route
										path="/u/:username"
										element={<ProfilePage />}
									/>
									<Route
										path="/settings"
										element={<SettingsPage />}
									/>
									<Route
										path="*"
										element={<Navigate to="/" replace />}
									/>
								</Routes>
							</Suspense>
						</ErrorBoundary>
						{isAuthRoute && (
							<AuthFormModal
								mode={
									location.pathname === '/register'
										? 'register'
										: 'login'
								}
								returnTo={returnTo}
							/>
						)}
					</main>
				</div>
			</div>
		</>
	);
}

function App() {
	return (
		<AuthProvider>
			<ToastProvider>
				<BrowserRouter>
					<AppRoutes />
				</BrowserRouter>
			</ToastProvider>
		</AuthProvider>
	);
}

export default App;
