import fs from 'node:fs/promises';
import { eq, lt, sql } from 'drizzle-orm';
import type { AdminTransfer, PublicTransfer } from '$lib/types';
import { db } from './db';
import { files, transfers, type TransferFile, type TransferWithFiles } from './db/schema';
import { newId } from './ids';
import { ensureTransferDir, filePath, removeTransferDir } from './storage';

export const MAX_FILES = 50;
export const MAX_DAYS = 30;
export const DEFAULT_DAYS = 7;
/** Tamaño máximo de un chunk de subida. El cliente manda 16 MB; nginx y adapter-node aceptan 64M. */
export const MAX_CHUNK = 64 * 1024 * 1024;
const DAY_MS = 86_400_000;

export type NewFileInput = { name: string; size: number; type?: string | null };

/** Solo el nombre base (sin rutas), sin caracteres de control, máximo 200 caracteres. */
function cleanName(name: string): string {
	const base = name.split(/[\\/]/).pop() ?? '';
	// eslint-disable-next-line no-control-regex
	const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
	return (clean || 'archivo').slice(0, 200);
}

export async function createTransfer(input: {
	message: string | null;
	days: number;
	files: NewFileInput[];
}): Promise<{ id: string; files: { id: string; name: string; size: number }[] }> {
	const id = newId(10);
	const days = Math.min(Math.max(Math.round(input.days) || DEFAULT_DAYS, 1), MAX_DAYS);
	const now = new Date();
	const rows = input.files.map((f, i) => ({
		id: newId(8),
		transferId: id,
		name: cleanName(f.name),
		size: f.size,
		mime: f.type || null,
		uploaded: 0,
		complete: f.size === 0,
		position: i
	}));
	const totalSize = rows.reduce((acc, r) => acc + r.size, 0);

	await ensureTransferDir(id);
	// Un archivo vacío no manda chunks: se deja creado en disco desde ya.
	for (const r of rows) if (r.size === 0) await fs.writeFile(filePath(id, r.id), '');

	db.transaction((tx) => {
		tx.insert(transfers)
			.values({
				id,
				message: input.message,
				totalSize,
				createdAt: now,
				expiresAt: new Date(now.getTime() + days * DAY_MS)
			})
			.run();
		tx.insert(files).values(rows).run();
	});

	return { id, files: rows.map((r) => ({ id: r.id, name: r.name, size: r.size })) };
}

export async function getTransfer(id: string): Promise<TransferWithFiles | undefined> {
	return db.query.transfers.findFirst({
		where: eq(transfers.id, id),
		with: { files: { orderBy: (f, { asc }) => [asc(f.position)] } }
	});
}

export async function listTransfers(): Promise<TransferWithFiles[]> {
	return db.query.transfers.findMany({
		orderBy: (t, { desc }) => [desc(t.createdAt)],
		with: { files: { orderBy: (f, { asc }) => [asc(f.position)] } }
	});
}

export function isExpired(t: { expiresAt: Date }): boolean {
	return t.expiresAt.getTime() <= Date.now();
}

export async function markFileProgress(fileId: string, uploaded: number, size: number): Promise<void> {
	await db
		.update(files)
		.set({ uploaded, complete: uploaded >= size })
		.where(eq(files.id, fileId));
}

/** Cierra la transferencia si ya están todos los archivos; si no, dice cuáles faltan. */
export async function finishTransfer(
	t: TransferWithFiles
): Promise<{ ready: boolean; pending: string[] }> {
	const pending = t.files.filter((f) => !f.complete).map((f) => f.name);
	if (pending.length) return { ready: false, pending };
	await db.update(transfers).set({ status: 'ready' }).where(eq(transfers.id, t.id));
	return { ready: true, pending: [] };
}

export async function deleteTransfer(id: string): Promise<void> {
	await removeTransferDir(id);
	// Los files se van solos por el ON DELETE CASCADE (foreign_keys = ON en db/index.ts).
	await db.delete(transfers).where(eq(transfers.id, id));
}

export async function registerDownload(fileId: string): Promise<void> {
	await db
		.update(files)
		.set({ downloads: sql`${files.downloads} + 1`, lastDownloadAt: new Date() })
		.where(eq(files.id, fileId));
}

/** Borra (disco + DB) las transferencias cuya fecha de expiración ya pasó. */
export async function cleanupExpired(): Promise<number> {
	const expired = await db
		.select({ id: transfers.id })
		.from(transfers)
		.where(lt(transfers.expiresAt, new Date()));
	for (const { id } of expired) await deleteTransfer(id);
	if (expired.length) {
		console.log(`[transfiere] ${expired.length} transferencia(s) expirada(s) eliminada(s)`);
	}
	return expired.length;
}

function publicFile(f: TransferFile) {
	return {
		id: f.id,
		name: f.name,
		size: f.size,
		mime: f.mime,
		complete: f.complete,
		uploaded: f.complete ? f.size : f.uploaded
	};
}

/** Lo que ve quien recibe el link. */
export function publicView(t: TransferWithFiles): PublicTransfer {
	return {
		id: t.id,
		message: t.message,
		status: t.status,
		totalSize: t.totalSize,
		createdAt: t.createdAt.getTime(),
		expiresAt: t.expiresAt.getTime(),
		files: t.files.map(publicFile)
	};
}

/** Lo que ve quien manda (agrega descargas). */
export function adminView(t: TransferWithFiles): AdminTransfer {
	return {
		...publicView(t),
		files: t.files.map((f) => ({
			...publicFile(f),
			downloads: f.downloads,
			lastDownloadAt: f.lastDownloadAt ? f.lastDownloadAt.getTime() : null
		}))
	};
}
