import { error } from '@sveltejs/kit';
import { isValidId } from '$lib/server/ids';
import { getTransfer, isExpired, publicView } from '$lib/server/transfers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	if (!isValidId(params.tid)) error(404, 'Este link no existe');
	const transfer = await getTransfer(params.tid);
	if (!transfer || isExpired(transfer)) error(404, 'Este link ya expiró o no existe');
	setHeaders({ 'Cache-Control': 'no-store' });
	return { transfer: publicView(transfer) };
};
