import { Readable } from 'node:stream';
import archiver from 'archiver';
import { error, type RequestHandler } from '@sveltejs/kit';
import { contentDisposition, uniqueName } from '$lib/server/http';
import { isValidId } from '$lib/server/ids';
import { filePath } from '$lib/server/storage';
import { getTransfer, isExpired, registerDownload } from '$lib/server/transfers';

// GET /d/<tid>/todo.zip — todos los archivos en un zip SIN comprimir (modo store): se arma
// al vuelo y se va mandando conforme se lee del disco, sin archivos temporales ni esperas.
export const GET: RequestHandler = async ({ params }) => {
	if (!isValidId(params.tid)) error(404, 'Este link no existe');
	const transfer = await getTransfer(params.tid);
	if (!transfer || isExpired(transfer)) error(404, 'Este link ya expiró o no existe');

	const ready = transfer.files.filter((f) => f.complete);
	if (!ready.length) error(404, 'Todavía no hay archivos listos para descargar');

	const archive = archiver('zip', { store: true });
	archive.on('warning', (e) => console.warn('[transfiere] zip aviso:', e.message));
	archive.on('error', (e) => console.error('[transfiere] zip error:', e.message));

	const used = new Set<string>();
	for (const f of ready) archive.file(filePath(transfer.id, f.id), { name: uniqueName(f.name, used) });
	void archive.finalize();

	for (const f of ready) await registerDownload(f.id);

	return new Response(Readable.toWeb(archive) as unknown as ReadableStream, {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': contentDisposition(`transfiere-${transfer.id}.zip`),
			'Cache-Control': 'private, no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
