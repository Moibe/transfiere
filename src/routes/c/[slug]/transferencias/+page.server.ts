import { error, redirect } from '@sveltejs/kit';
import { isClientAuthed } from '$lib/server/auth';
import { getClientBySlug, publicClient } from '$lib/server/clients';
import { adminView, listTransfers } from '$lib/server/transfers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const client = await getClientBySlug(params.slug);
	if (!client) error(404, 'Este portal no existe');
	if (!isClientAuthed(cookies, client)) redirect(303, `/c/${client.slug}`);
	const own = await listTransfers(client.id);
	return {
		client: publicClient(client),
		clientAuthed: true,
		// El negocio no necesita ver su propio nombre en cada tarjeta.
		transfers: own.map((t) => ({ ...adminView(t), clientName: null }))
	};
};
