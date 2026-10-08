import fs from 'node:fs/promises';
import path from 'node:path';
import { count, eq, sum } from 'drizzle-orm';
import { error, type RequestEvent } from '@sveltejs/kit';
import type { AdminClient, PublicClient } from '$lib/types';
import { hashPassword, isAuthed, isClientAuthed } from './auth';
import { db } from './db';
import { clients, transfers, type Client } from './db/schema';
import { newId } from './ids';
import { DATA_DIR } from './storage';
import { deleteTransfer } from './transfers';

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const COLOR_RE = /^#[0-9a-f]{6}$/i;
export const MAX_LOGO = 2 * 1024 * 1024;
/** Header con el que el portal de un cliente le dice a la API "subo como este negocio". */
export const CLIENT_HEADER = 'x-transfiere-client';

const LOGO_DIR = path.join(DATA_DIR, 'logos');
export const logoPath = (clientId: string) => path.join(LOGO_DIR, clientId);

export async function getClientBySlug(slug: string | null | undefined): Promise<Client | undefined> {
	if (!slug || !SLUG_RE.test(slug)) return undefined;
	return db.query.clients.findFirst({ where: eq(clients.slug, slug) });
}

export async function getClientById(id: string): Promise<Client | undefined> {
	return db.query.clients.findFirst({ where: eq(clients.id, id) });
}

export function publicClient(c: Client): PublicClient {
	return {
		id: c.id,
		slug: c.slug,
		name: c.name,
		color: c.color,
		logoUrl: c.logoMime ? `/logo/${c.id}?v=${c.updatedAt.getTime()}` : null
	};
}

export async function listClients(): Promise<AdminClient[]> {
	const rows = await db
		.select({
			client: clients,
			transferCount: count(transfers.id),
			totalSize: sum(transfers.totalSize)
		})
		.from(clients)
		.leftJoin(transfers, eq(transfers.clientId, clients.id))
		.groupBy(clients.id)
		.orderBy(clients.name);
	return rows.map((r) => ({
		...publicClient(r.client),
		createdAt: r.client.createdAt.getTime(),
		transferCount: r.transferCount,
		totalSize: Number(r.totalSize ?? 0)
	}));
}

// ---------- logos ----------

/** Solo PNG, JPEG o WebP, validados por sus primeros bytes. SVG no: puede traer scripts. */
function sniffImage(buf: Buffer): string | null {
	if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
		return 'image/png';
	}
	if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
	if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
		return 'image/webp';
	}
	return null;
}

export type LogoInput = { buf: Buffer; mime: string };

/** null = no mandaron logo; string = mensaje de error para el usuario. */
export async function readLogo(value: FormDataEntryValue | null): Promise<LogoInput | null | string> {
	if (!value || typeof value === 'string' || value.size === 0) return null;
	if (value.size > MAX_LOGO) return 'El logo pesa más de 2 MB';
	const buf = Buffer.from(await value.arrayBuffer());
	const mime = sniffImage(buf);
	if (!mime) return 'El logo tiene que ser PNG, JPG o WebP';
	return { buf, mime };
}

async function writeLogo(clientId: string, logo: LogoInput) {
	await fs.mkdir(LOGO_DIR, { recursive: true });
	await fs.writeFile(logoPath(clientId), logo.buf);
}

// ---------- alta / cambios / baja ----------

export async function createClient(input: {
	name: string;
	slug: string;
	color: string;
	password: string;
	logo: LogoInput | null;
}): Promise<Client> {
	const id = newId(8);
	const now = new Date();
	if (input.logo) await writeLogo(id, input.logo);
	const [row] = await db
		.insert(clients)
		.values({
			id,
			slug: input.slug,
			name: input.name,
			color: input.color,
			logoMime: input.logo?.mime ?? null,
			passwordHash: hashPassword(input.password),
			createdAt: now,
			updatedAt: now
		})
		.returning();
	return row;
}

export async function updateClient(
	client: Client,
	input: {
		name: string;
		color: string;
		password: string | null;
		logo: LogoInput | null;
		removeLogo: boolean;
	}
): Promise<void> {
	let logoMime = client.logoMime;
	if (input.logo) {
		await writeLogo(client.id, input.logo);
		logoMime = input.logo.mime;
	} else if (input.removeLogo) {
		await fs.rm(logoPath(client.id), { force: true });
		logoMime = null;
	}
	await db
		.update(clients)
		.set({
			name: input.name,
			color: input.color,
			logoMime,
			...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
			updatedAt: new Date()
		})
		.where(eq(clients.id, client.id));
}

/** Borra el negocio, todas sus transferencias (disco + DB) y su logo. */
export async function deleteClient(client: Client): Promise<void> {
	const own = await db
		.select({ id: transfers.id })
		.from(transfers)
		.where(eq(transfers.clientId, client.id));
	for (const { id } of own) await deleteTransfer(id);
	await fs.rm(logoPath(client.id), { force: true });
	await db.delete(clients).where(eq(clients.id, client.id));
}

// ---------- quién hace la petición ----------

export type Actor = { kind: 'owner' } | { kind: 'client'; client: Client };

/**
 * Para la API de subida. Si viene el header del portal, exige la sesión de ESE cliente;
 * si no, exige la del dueño.
 */
export async function requireActor(event: RequestEvent): Promise<Actor> {
	const slug = event.request.headers.get(CLIENT_HEADER);
	if (slug) {
		const client = await getClientBySlug(slug);
		if (client && isClientAuthed(event.cookies, client)) return { kind: 'client', client };
		error(401, 'Necesitas la clave para subir archivos');
	}
	if (isAuthed(event.cookies)) return { kind: 'owner' };
	error(401, 'Necesitas la clave para subir archivos');
}

/** El dueño puede todo; un cliente solo lo suyo. */
export function canTouch(actor: Actor, transfer: { clientId: string | null }): boolean {
	return actor.kind === 'owner' || transfer.clientId === actor.client.id;
}
