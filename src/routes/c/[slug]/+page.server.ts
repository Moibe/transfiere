import { error, fail, redirect } from '@sveltejs/kit';
import { isClientAuthed, loginClient, logoutClient, verifyPassword } from '$lib/server/auth';
import { getClientBySlug, publicClient } from '$lib/server/clients';
import type { Actions, PageServerLoad } from './$types';

// Portal de un negocio: /c/<slug>. Con su clave sube archivos a nombre del negocio.
export const load: PageServerLoad = async ({ params, cookies }) => {
	const client = await getClientBySlug(params.slug);
	if (!client) error(404, 'Este portal no existe');
	return { client: publicClient(client), clientAuthed: isClientAuthed(cookies, client) };
};

export const actions: Actions = {
	entrar: async ({ params, request, cookies }) => {
		const client = await getClientBySlug(params.slug);
		if (!client) error(404, 'Este portal no existe');
		const clave = String((await request.formData()).get('clave') ?? '');
		if (!verifyPassword(clave, client.passwordHash)) {
			// Freno sencillo contra adivinar claves a lo bruto.
			await new Promise((r) => setTimeout(r, 600));
			return fail(401, { error: 'Esa no es la clave 🙈' });
		}
		loginClient(cookies, client);
		redirect(303, `/c/${client.slug}`);
	},
	salir: async ({ params, cookies }) => {
		const client = await getClientBySlug(params.slug);
		if (client) logoutClient(cookies, client);
		redirect(303, `/c/${params.slug}`);
	}
};
