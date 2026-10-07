import { fail, redirect } from '@sveltejs/kit';
import { checkPassword, isConfigured, login, logout } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	return { authed: locals.authed, configured: isConfigured() };
};

export const actions: Actions = {
	entrar: async ({ request, cookies }) => {
		const data = await request.formData();
		const clave = String(data.get('clave') ?? '');
		if (!isConfigured()) return fail(500, { error: 'Falta UPLOAD_PASSWORD en el .env del servidor' });
		if (!checkPassword(clave)) return fail(401, { error: 'Esa no es la clave 🙈' });
		login(cookies);
		redirect(303, '/');
	},
	salir: async ({ cookies }) => {
		logout(cookies);
		redirect(303, '/');
	}
};
