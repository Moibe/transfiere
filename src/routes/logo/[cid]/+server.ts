import fs from 'node:fs/promises';
import { error, type RequestHandler } from '@sveltejs/kit';
import { getClientById, logoPath } from '$lib/server/clients';
import { isValidId } from '$lib/server/ids';

// GET /logo/<clientId> — logo público de un negocio (sale en su portal y en sus links).
// La URL lleva ?v=<updatedAt>, así que se puede cachear largo: al cambiar el logo cambia la URL.
export const GET: RequestHandler = async ({ params }) => {
	if (!isValidId(params.cid)) error(404, 'No existe');
	const client = await getClientById(params.cid);
	if (!client?.logoMime) error(404, 'Este negocio no tiene logo');
	const buf = await fs.readFile(logoPath(client.id)).catch(() => null);
	if (!buf) error(404, 'Este negocio no tiene logo');
	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': client.logoMime,
			'Content-Length': String(buf.length),
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
