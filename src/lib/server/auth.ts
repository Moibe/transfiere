import { createHash, timingSafeEqual } from 'node:crypto';
import { error, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Subir archivos requiere la clave (UPLOAD_PASSWORD del .env). Descargar NO: quien recibe el
// link solo lo abre. La sesión es una cookie httpOnly con el hash de la clave; si la clave
// cambia en el .env, todas las sesiones caducan solas.
export const AUTH_COOKIE = 'transfiere_clave';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function isConfigured(): boolean {
	return Boolean(env.UPLOAD_PASSWORD);
}

function sessionToken(): string | null {
	if (!env.UPLOAD_PASSWORD) return null;
	return createHash('sha256').update(`transfiere:${env.UPLOAD_PASSWORD}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isAuthed(cookies: Cookies): boolean {
	const token = sessionToken();
	const cookie = cookies.get(AUTH_COOKIE);
	return Boolean(token && cookie && safeEqual(cookie, token));
}

export function checkPassword(candidate: string): boolean {
	return Boolean(env.UPLOAD_PASSWORD) && safeEqual(candidate, env.UPLOAD_PASSWORD);
}

export function login(cookies: Cookies): void {
	const token = sessionToken();
	if (!token) return;
	cookies.set(AUTH_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: THIRTY_DAYS
	});
}

export function logout(cookies: Cookies): void {
	cookies.delete(AUTH_COOKIE, { path: '/' });
}

/** Para los endpoints de subida: 401 en JSON si no hay sesión. */
export function requireAuth(event: RequestEvent): void {
	if (!isAuthed(event.cookies)) error(401, 'Necesitas la clave para subir archivos');
}
