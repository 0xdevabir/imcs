function determineFallbackApiUrl() {
	if (typeof window === 'undefined') {
		return 'http://localhost:3001';
	}

	const host = window.location.hostname;
	const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
	const port = 3001;

	if (host === 'localhost' || host === '127.0.0.1') {
		return `${protocol}//localhost:${port}`;
	}

	return `${protocol}//${host}:${port}`;
}

const fallbackApiUrl = determineFallbackApiUrl();

function isAbsoluteHttpUrl(value: string) {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

function resolveApiUrl() {
	const raw = process.env.NEXT_PUBLIC_API_URL;
	const candidate = raw?.trim();

	if (candidate) {
		// Allow same-origin proxy paths like "/api".
		if (candidate.startsWith('/') && !candidate.startsWith('//') && candidate !== '/') {
			return candidate.replace(/\/+$/, '');
		}

		// Ignore relative or malformed values (e.g. "/", "localhost:3001").
		if (!isAbsoluteHttpUrl(candidate)) {
			return fallbackApiUrl;
		}

		return candidate.replace(/\/+$/, '');
	}

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
	if (backendUrl) {
		return backendUrl.replace(/\/+$/, '');
	}

	// Empty or undefined env vars should not produce relative requests like /auth/login.
	return fallbackApiUrl;
}

export const API_URL = resolveApiUrl();

function isNgrokUrl(value: string) {
	try {
		const parsed = new URL(value);
		return /\.ngrok(-free)?\.(app|dev)$/i.test(parsed.hostname);
	} catch {
		return false;
	}
}

function resolveSocketPath() {
	if (API_URL.startsWith('/')) {
		return `${API_URL}/socket.io/`;
	}

	return '/socket.io/';
}

function resolveSocketTransports(): Array<'polling' | 'websocket'> {
	if (typeof window !== 'undefined') {
		const isLocalBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
		if (isLocalBrowser && API_URL.startsWith('/')) {
			// In local https + Next rewrite mode, websocket upgrade is noisy and unreliable.
			return ['polling'];
		}
	}

	return ['websocket', 'polling'];
}

function resolveSocketUrl() {
	const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
	if (explicitSocketUrl && isAbsoluteHttpUrl(explicitSocketUrl)) {
		return explicitSocketUrl.replace(/\/+$/, '');
	}

	// When API_URL is a same-origin proxy path (e.g. /api), route socket.io through
	// that proxy to avoid mixed-content/TLS mismatches in https local development.
	if (API_URL.startsWith('/')) {
		if (typeof window !== 'undefined') {
			return window.location.origin;
		}

		return 'http://localhost:3000';
	}

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
	if (backendUrl && isAbsoluteHttpUrl(backendUrl)) {
		if (typeof window !== 'undefined') {
			const isLocalBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
			if (isLocalBrowser && isNgrokUrl(backendUrl)) {
				return fallbackApiUrl;
			}
		}
		return backendUrl.replace(/\/+$/, '');
	}

	if (isAbsoluteHttpUrl(API_URL)) {
		return API_URL;
	}

	return fallbackApiUrl;
}

export const SOCKET_PATH = resolveSocketPath();
export const SOCKET_URL = resolveSocketUrl();
export const SOCKET_TRANSPORTS = resolveSocketTransports();
export const SOCKET_UPGRADE = SOCKET_TRANSPORTS.includes('websocket');
export const SOCKET_CONNECT_DELAY_MS = 50;

export const AUTH_TOKEN_COOKIE_NAME = 'imcs_auth';

const NGROK_SKIP_HEADER = 'ngrok-skip-browser-warning';

export function buildApiHeaders(init: HeadersInit = {}): Headers {
	const headers = new Headers(init);
	if (!headers.has(NGROK_SKIP_HEADER)) {
		headers.set(NGROK_SKIP_HEADER, 'true');
	}
	return headers;
}

function parseCookieValue(name: string): string | null {
	if (typeof document === 'undefined') return null;
	const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}\\()\[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
	return matches ? decodeURIComponent(matches[1]) : null;
}

export function setAuthTokenCookie(token: string): void {
	if (typeof document === 'undefined') return;
	const maxAge = 60 * 60; // 1 hour
	const sameSite = 'Lax';
	const secure = window.location.protocol === 'https:';
	document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=${sameSite}${secure ? '; Secure' : ''}`;
}

export function clearAuthTokenCookie(): void {
	if (typeof document === 'undefined') return;
	document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax;`;
}

export function getAuthToken(): string | null {
	return parseCookieValue(AUTH_TOKEN_COOKIE_NAME);
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
	const token = getAuthToken();
	const headers = buildApiHeaders(init.headers ?? {});
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	return fetch(input, {
		...init,
		headers,
		credentials: init.credentials ?? 'include', // include for cross-origin cookie auth flows and CORS
	});
}

