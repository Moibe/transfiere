import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { type Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Client } from './db/schema';

// Dos tipos de sesión, ambas en cookies httpOnly:
//  - Dueño (Moibe): clave UPLOAD_PASSWORD del .env. Ve y administra todo.
//  - Cliente (un negocio): su propia clave, guardada con scrypt. Solo ve lo suyo.
// Descargar un link nunca pide clave.
export const AUTH_COOKIE = 'transfiere_clave';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function isConfigured(): boolean {
	return Boolean(env.UPLOAD_PASSWORD);
}

function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const cookieOpts = { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge: THIRTY_DAYS };

// ---------- dueño ----------

function ownerToken(): string | null {
	if (!env.UPLOAD_PASSWORD) return null;
	return createHash('sha256').update(`transfiere:${env.UPLOAD_PASSWORD}`).digest('hex');
}

export function isAuthed(cookies: Cookies): boolean {
	const token = ownerToken();
	const cookie = cookies.get(AUTH_COOKIE);
	return Boolean(token && cookie && safeEqual(cookie, token));
}

export function checkPassword(candidate: string): boolean {
	return Boolean(env.UPLOAD_PASSWORD) && safeEqual(candidate, env.UPLOAD_PASSWORD);
}

export function login(cookies: Cookies): void {
	const token = ownerToken();
	if (token) cookies.set(AUTH_COOKIE, token, cookieOpts);
}

export function logout(cookies: Cookies): void {
	cookies.delete(AUTH_COOKIE, { path: '/' });
}

// ---------- clientes ----------

export function hashPassword(password: string): string {
	const salt = randomBytes(16);
	const hash = scryptSync(password, salt, 32);
	return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [kind, salt, hash] = stored.split('$');
	if (kind !== 'scrypt' || !salt || !hash) return false;
	const calc = scryptSync(password, Buffer.from(salt, 'hex'), 32);
	const expected = Buffer.from(hash, 'hex');
	return calc.length === expected.length && timingSafeEqual(calc, expected);
}

// El token firma id + hash de la clave: si le cambias la clave a un cliente, sus sesiones caducan.
function sessionSecret(): string {
	return env.SESSION_SECRET || env.UPLOAD_PASSWORD || '';
}

function clientToken(client: Client): string {
	return createHmac('sha256', `transfiere-client:${sessionSecret()}`)
		.update(`${client.id}:${client.passwordHash}`)
		.digest('hex');
}

const clientCookie = (client: Client) => `tc_${client.id}`;

export function isClientAuthed(cookies: Cookies, client: Client): boolean {
	if (!sessionSecret()) return false;
	const cookie = cookies.get(clientCookie(client));
	return Boolean(cookie && safeEqual(cookie, clientToken(client)));
}

export function loginClient(cookies: Cookies, client: Client): void {
	if (sessionSecret()) cookies.set(clientCookie(client), clientToken(client), cookieOpts);
}

export function logoutClient(cookies: Cookies, client: Client): void {
	cookies.delete(clientCookie(client), { path: '/' });
}
