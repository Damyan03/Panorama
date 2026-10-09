import type { AuthenticatedUser, LoginResponse } from './types';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from './constants';

export function getStoredAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredAuthUser(): AuthenticatedUser | null {
	if (typeof window === 'undefined') return null;
	const raw = window.localStorage.getItem(AUTH_USER_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AuthenticatedUser;
	} catch {
		window.localStorage.removeItem(AUTH_USER_KEY);
		return null;
	}
}

export function persistAuthSession(response: LoginResponse) {
	window.localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
	window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
}

/** Update only the cached user (e.g. after a profile/settings change). */
export function persistAuthUser(user: AuthenticatedUser) {
	window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
	window.localStorage.removeItem(AUTH_TOKEN_KEY);
	window.localStorage.removeItem(AUTH_USER_KEY);
}
