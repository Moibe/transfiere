import { error, json, type RequestHandler } from '@sveltejs/kit';
import { canTouch, requireActor } from '$lib/server/clients';
import { isValidId } from '$lib/server/ids';
import { finishTransfer, getTransfer, isExpired } from '$lib/server/transfers';

// POST /api/transfers/<tid>/finish — marca la transferencia como lista cuando ya están
// todos los archivos completos en disco.
export const POST: RequestHandler = async (event) => {
	const actor = await requireActor(event);
	const { tid } = event.params;
	if (!isValidId(tid)) error(404, 'Este link no existe');

	const transfer = await getTransfer(tid);
	if (!transfer || isExpired(transfer) || !canTouch(actor, transfer)) {
		error(404, 'Este link ya expiró o no existe');
	}
	if (transfer.status === 'ready') return json({ ready: true, pending: [] });

	const result = await finishTransfer(transfer);
	if (!result.ready) {
		error(409, `Todavía faltan archivos por terminar de subir: ${result.pending.join(', ')}`);
	}
	return json(result);
};
