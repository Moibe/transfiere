import { error, json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { isValidId } from '$lib/server/ids';
import { deleteTransfer, getTransfer, isExpired, publicView } from '$lib/server/transfers';

async function load(tid: string | undefined) {
	if (!isValidId(tid)) error(404, 'Este link no existe');
	const transfer = await getTransfer(tid);
	if (!transfer || isExpired(transfer)) error(404, 'Este link ya expiró o no existe');
	return transfer;
}

// GET /api/transfers/<tid> — estado público (lo usa la página de descarga para refrescarse
// mientras los archivos siguen subiendo).
export const GET: RequestHandler = async ({ params }) => {
	const transfer = await load(params.tid);
	return json(publicView(transfer), { headers: { 'Cache-Control': 'no-store' } });
};

// DELETE /api/transfers/<tid> — borra archivos + metadata. Solo con la clave.
export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const transfer = await load(event.params.tid);
	await deleteTransfer(transfer.id);
	return json({ ok: true });
};
