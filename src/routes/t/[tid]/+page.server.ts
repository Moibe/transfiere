import { error } from '@sveltejs/kit';
import { isClientAuthed } from '$lib/server/auth';
import { publicClient } from '$lib/server/clients';
import { isValidId } from '$lib/server/ids';
import { getTransfer, isExpired, publicView } from '$lib/server/transfers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders, cookies }) => {
	if (!isValidId(params.tid)) error(404, 'Este link no existe');
	const transfer = await getTransfer(params.tid);
	if (!transfer || isExpired(transfer)) error(404, 'Este link ya expiró o no existe');
	setHeaders({ 'Cache-Control': 'no-store' });
	// Si lo mandó un negocio, la página lleva su marca (logo, nombre y color).
	const client = transfer.client ?? null;
	return {
		transfer: publicView(transfer),
		client: client ? publicClient(client) : undefined,
		clientAuthed: client ? isClientAuthed(cookies, client) : false
	};
};
