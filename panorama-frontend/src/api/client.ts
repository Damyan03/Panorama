import { AUTH_TOKEN_KEY } from '../auth/constants';

const DEFAULT_API_BASE_URL = '/api';

/** Resolved API base URL (no trailing slash). Reads `VITE_API_BASE_URL` at build time. */
export function getApiBaseUrl(): string {
	const envBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
	return envBase.endsWith('/') ? envBase.slice(0, -1) : envBase;
}

export function getAuthToken(): string | null {
	if (typeof window === 'undefined') return null;
	return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function buildHeaders(
	init: HeadersInit | undefined,
	hasJsonBody: boolean,
): Headers {
	const headers = new Headers(init);
	headers.set('Accept', 'application/json');
	const token = getAuthToken();
	if (token) headers.set('Authorization', `Bearer ${token}`);
	if (hasJsonBody && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	return headers;
}

export class ApiError extends Error {
	readonly status: number;
	readonly body: string;

	constructor(status: number, body: string) {
		super(`Request failed with status ${status}`);
		this.name = 'ApiError';
		this.status = status;
		this.body = body;
	}
}

/**
 * Issue an authenticated request to the API. JSON-encodes plain objects
 * automatically; passes through `FormData`, `Blob`, and string bodies untouched.
 */
export async function apiFetch(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const body = init.body;
	const isJsonBody =
		body != null &&
		!(body instanceof FormData) &&
		!(body instanceof Blob) &&
		!(body instanceof URLSearchParams) &&
		!(body instanceof ArrayBuffer) &&
		typeof body !== 'string';

	const finalBody = isJsonBody
		? JSON.stringify(body)
		: (body as BodyInit | null | undefined);

	const response = await fetch(`${getApiBaseUrl()}${path}`, {
		...init,
		body: finalBody,
		headers: buildHeaders(init.headers, isJsonBody),
	});

	if (!response.ok) {
		throw new ApiError(response.status, await response.text());
	}
	return response;
}

/** Issue an authenticated request and parse the JSON response. */
export async function requestJson<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await apiFetch(path, init);
	if (response.status === 204) return undefined as T;
	const text = await response.text();
	return text ? (JSON.parse(text) as T) : (undefined as T);
}
