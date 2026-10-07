import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { error, type RequestHandler } from '@sveltejs/kit';
import { contentDisposition } from '$lib/server/http';
import { isValidId } from '$lib/server/ids';
import { filePath } from '$lib/server/storage';
import { getTransfer, isExpired, registerDownload } from '$lib/server/transfers';

// GET /d/<tid>/<fid>/<nombre> — descarga pública con soporte de Range (el navegador puede
// pausar/reanudar y los gestores de descarga pueden partirla). <nombre> solo adorna la URL:
// el nombre real sale de la DB.
export const GET: RequestHandler = async ({ params, request }) => {
	if (!isValidId(params.tid) || !isValidId(params.fid)) error(404, 'Este link no existe');
	const transfer = await getTransfer(params.tid);
	if (!transfer || isExpired(transfer)) error(404, 'Este link ya expiró o no existe');
	const file = transfer.files.find((f) => f.id === params.fid);
	if (!file || !file.complete) error(404, 'Este archivo todavía no está disponible');

	const target = filePath(transfer.id, file.id);
	const stat = await fs.stat(target).catch(() => null);
	if (!stat) error(404, 'El archivo ya no está en el servidor');
	const size = stat.size;

	const headers = new Headers({
		'Content-Type': file.mime || 'application/octet-stream',
		'Content-Disposition': contentDisposition(file.name),
		'Accept-Ranges': 'bytes',
		'Cache-Control': 'private, no-store',
		'Last-Modified': stat.mtime.toUTCString(),
		'X-Content-Type-Options': 'nosniff'
	});

	let start = 0;
	let end = size - 1;
	let status = 200;
	const range = request.headers.get('range');
	if (range) {
		const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
		const unsatisfiable = () =>
			new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
		if (!m || (m[1] === '' && m[2] === '') || size === 0) return unsatisfiable();
		if (m[1] === '') {
			start = Math.max(0, size - Number(m[2]));
		} else {
			start = Number(m[1]);
			if (m[2] !== '') end = Math.min(Number(m[2]), size - 1);
		}
		if (start >= size || start > end) return unsatisfiable();
		status = 206;
		headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
	}

	// Cuenta la descarga una vez (cuando piden desde el byte 0), no en cada reanudación.
	if (start === 0) await registerDownload(file.id);

	if (size === 0) {
		headers.set('Content-Length', '0');
		return new Response(null, { status: 200, headers });
	}

	headers.set('Content-Length', String(end - start + 1));
	const stream = createReadStream(target, { start, end });
	return new Response(Readable.toWeb(stream) as unknown as ReadableStream, { status, headers });
};
