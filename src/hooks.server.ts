import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { isAuthed } from '$lib/server/auth';
import { cleanupExpired } from '$lib/server/transfers';

// Limpieza de transferencias expiradas: al arrancar y luego cada hora. El guard en
// globalThis evita duplicar el timer cuando Vite recarga este módulo en dev.
const CLEANUP_EVERY_MS = 60 * 60 * 1000;
const g = globalThis as typeof globalThis & {
	__transfiereCleanup?: ReturnType<typeof setInterval>;
};
if (!building && !g.__transfiereCleanup) {
	const run = () =>
		cleanupExpired().catch((e) => console.error('[transfiere] la limpieza falló:', e));
	run();
	g.__transfiereCleanup = setInterval(run, CLEANUP_EVERY_MS);
	g.__transfiereCleanup.unref?.();
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.authed = isAuthed(event.cookies);
	return resolve(event);
};
