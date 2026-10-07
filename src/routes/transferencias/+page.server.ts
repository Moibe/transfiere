import { redirect } from '@sveltejs/kit';
import { adminView, listTransfers } from '$lib/server/transfers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.authed) redirect(303, '/');
	const all = await listTransfers();
	return { transfers: all.map(adminView) };
};
