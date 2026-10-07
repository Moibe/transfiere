import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { isValidId } from '$lib/server/ids';
import { filePath, sizeOnDisk } from '$lib/server/storage';
import { getTransfer, isExpired, markFileProgress, MAX_CHUNK } from '$lib/server/transfers';

// Subida por chunks: el cliente manda `PUT ?offset=N&length=M` con el pedazo crudo en el body
// y el server lo APPENDEA al archivo. Si algo se corta a media escritura, los bytes que sí
// llegaron son un prefijo válido del archivo, así que basta con reportar cuántos hay
// (`uploaded`) y el cliente retoma desde ahí. Nada se guarda en memoria: se hace stream a disco.

// Un chunk a la vez por archivo: evita que un reintento tempranero escriba encimado.
const writing = new Set<string>();

async function loadFile(tid: string | undefined, fid: string | undefined) {
	if (!isValidId(tid) || !isValidId(fid)) error(404, 'No existe');
	const transfer = await getTransfer(tid);
	if (!transfer || isExpired(transfer)) error(404, 'Esta transferencia no existe o ya expiró');
	const file = transfer.files.find((f) => f.id === fid);
	if (!file) error(404, 'Ese archivo no es de esta transferencia');
	return { transfer, file };
}

// GET — cuántos bytes hay ya en disco (el cliente lo consulta para resincronizarse).
export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { transfer, file } = await loadFile(event.params.tid, event.params.fid);
	const uploaded = file.complete ? file.size : await sizeOnDisk(filePath(transfer.id, file.id));
	return json({ uploaded, size: file.size, complete: file.complete });
};

// PUT — appendea un chunk.
export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const { transfer, file } = await loadFile(event.params.tid, event.params.fid);
	if (transfer.status !== 'uploading') error(409, 'Esta transferencia ya está cerrada');
	if (file.complete) return json({ uploaded: file.size, complete: true });

	const offset = Number(event.url.searchParams.get('offset'));
	const length = Number(event.url.searchParams.get('length'));
	if (!Number.isInteger(offset) || offset < 0) error(400, 'offset inválido');
	if (!Number.isInteger(length) || length <= 0) error(400, 'length inválido');
	if (length > MAX_CHUNK) error(413, `Chunk demasiado grande (máximo ${MAX_CHUNK} bytes)`);
	if (offset + length > file.size) error(400, 'El chunk rebasa el tamaño declarado del archivo');
	if (!event.request.body) error(400, 'El chunk viene sin cuerpo');

	if (writing.has(file.id)) error(423, 'Todavía se está escribiendo el chunk anterior');
	writing.add(file.id);
	const target = filePath(transfer.id, file.id);
	try {
		const current = await sizeOnDisk(target);
		if (current !== offset) error(409, { message: 'Offset desfasado', uploaded: current });

		let written = 0;
		const counter = new Transform({
			transform(chunk: Buffer, _enc, cb) {
				written += chunk.length;
				if (written > length) cb(new Error('llegaron más bytes de los declarados'));
				else cb(null, chunk);
			}
		});

		let failure: string | null = null;
		try {
			await pipeline(
				Readable.fromWeb(event.request.body as unknown as NodeReadableStream),
				counter,
				createWriteStream(target, { flags: 'a' })
			);
		} catch (e) {
			failure = e instanceof Error ? e.message : 'error de escritura';
		}

		const actual = await sizeOnDisk(target);
		await markFileProgress(file.id, actual, file.size);

		if (failure) error(400, { message: `Se cortó la subida del chunk (${failure})`, uploaded: actual });
		if (actual !== offset + length) {
			error(400, { message: `Chunk incompleto: hay ${actual} bytes, se esperaban ${offset + length}`, uploaded: actual });
		}
		return json({ uploaded: actual, complete: actual >= file.size });
	} finally {
		writing.delete(file.id);
	}
};
