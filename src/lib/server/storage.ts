import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';

// Carpeta donde viven los archivos subidos: DATA_DIR/<transferId>/<fileId>.
// En el droplet es ~/code/transfiere/data (gitignoreada, persiste entre deploys).
export const DATA_DIR = path.resolve(env.DATA_DIR ?? './data');

export function transferDir(transferId: string): string {
	return path.join(DATA_DIR, transferId);
}

export function filePath(transferId: string, fileId: string): string {
	return path.join(transferDir(transferId), fileId);
}

export async function ensureTransferDir(transferId: string): Promise<void> {
	await fs.mkdir(transferDir(transferId), { recursive: true });
}

export async function removeTransferDir(transferId: string): Promise<void> {
	await fs.rm(transferDir(transferId), { recursive: true, force: true });
}

/** Tamaño actual del archivo en disco; 0 si todavía no existe. */
export async function sizeOnDisk(absPath: string): Promise<number> {
	try {
		return (await fs.stat(absPath)).size;
	} catch {
		return 0;
	}
}
