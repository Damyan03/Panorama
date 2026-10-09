import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { requestJson } from '../api/client';
import type {
	AuthenticatedUser,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
} from './types';
import {
	clearAuthSession,
	getStoredAuthToken,
	getStoredAuthUser,
	persistAuthSession,
	persistAuthUser,
} from './session';

interface AuthContextValue {
	user: AuthenticatedUser | null;
	/** True once the initial session-hydration round-trip has settled. */
	isReady: boolean;
	isAuthenticated: boolean;
	login: (request: LoginRequest) => Promise<void>;
	register: (request: RegisterRequest) => Promise<void>;
	logout: () => void;
	/** Replace the cached user (after profile/settings update) and persist it. */
	updateUser: (user: AuthenticatedUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthenticatedUser | null>(null);
	const [isReady, setIsReady] = useState(false);

	// Hydrate session from localStorage; revalidate the token via /auth/me so
	// revoked accounts and stale cached fields are flushed on app start.
	useEffect(() => {
		let active = true;

		async function hydrateSession() {
			const token = getStoredAuthToken();
			const storedUser = getStoredAuthUser();

			if (!token || !storedUser) {
				clearAuthSession();
				if (active) {
					setUser(null);
					setIsReady(true);
				}
				return;
			}

			try {
				const me = await requestJson<AuthenticatedUser>('/auth/me');
				if (!active) return;
				setUser(me);
				persistAuthUser(me);
			} catch {
				clearAuthSession();
				if (active) setUser(null);
			} finally {
				if (active) setIsReady(true);
			}
		}

		void hydrateSession();
		return () => {
			active = false;
		};
	}, []);

	const authenticate = useCallback(
		async (path: '/auth/login' | '/auth/register', body: unknown) => {
			const response = await requestJson<LoginResponse>(path, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			persistAuthSession(response);
			setUser(response.user);
		},
		[],
	);

	const login = useCallback(
		(request: LoginRequest) => authenticate('/auth/login', request),
		[authenticate],
	);

	const register = useCallback(
		(request: RegisterRequest) => authenticate('/auth/register', request),
		[authenticate],
	);

	const logout = useCallback(() => {
		clearAuthSession();
		setUser(null);
	}, []);

	const updateUser = useCallback((next: AuthenticatedUser) => {
		persistAuthUser(next);
		setUser(next);
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			isReady,
			isAuthenticated: user !== null,
			login,
			register,
			logout,
			updateUser,
		}),
		[user, isReady, login, register, logout, updateUser],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
