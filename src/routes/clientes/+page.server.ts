import { fail, redirect } from '@sveltejs/kit';
import {
	COLOR_RE,
	createClient,
	deleteClient,
	getClientById,
	getClientBySlug,
	listClients,
	readLogo,
	SLUG_RE,
	updateClient
} from '$lib/server/clients';
import type { Actions, PageServerLoad } from './$types';

// Alta y administración de negocios (solo el dueño).
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.authed) redirect(303, '/');
	return { clients: await listClients() };
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

export const actions: Actions = {
	crear: async ({ request, locals }) => {
		if (!locals.authed) return fail(401, { form: 'crear', error: 'Sin permiso' });
		const fd = await request.formData();
		const name = text(fd, 'name').slice(0, 80);
		const slug = text(fd, 'slug').toLowerCase();
		const color = text(fd, 'color') || '#ff2d75';
		const password = text(fd, 'password');
		const values = { name, slug, color };

		if (!name) return fail(400, { form: 'crear', error: 'Ponle nombre al negocio', values });
		if (!SLUG_RE.test(slug)) {
			return fail(400, {
				form: 'crear',
				error: 'La dirección solo admite minúsculas, números y guiones (máx. 40)',
				values
			});
		}
		if (await getClientBySlug(slug)) {
			return fail(400, { form: 'crear', error: `Ya existe un portal /c/${slug}`, values });
		}
		if (!COLOR_RE.test(color)) return fail(400, { form: 'crear', error: 'Color inválido', values });
		if (password.length < 6) {
			return fail(400, { form: 'crear', error: 'La clave debe tener al menos 6 caracteres', values });
		}
		const logo = await readLogo(fd.get('logo'));
		if (typeof logo === 'string') return fail(400, { form: 'crear', error: logo, values });

		const client = await createClient({ name, slug, color, password, logo });
		return { form: 'crear', ok: `Listo: ${client.name} ya tiene su portal en /c/${client.slug}` };
	},

	editar: async ({ request, locals }) => {
		if (!locals.authed) return fail(401, { form: 'editar', error: 'Sin permiso' });
		const fd = await request.formData();
		const id = text(fd, 'id');
		const client = await getClientById(id);
		if (!client) return fail(404, { form: 'editar', id, error: 'Ese negocio ya no existe' });

		const name = text(fd, 'name').slice(0, 80);
		const color = text(fd, 'color');
		const password = text(fd, 'password');
		if (!name) return fail(400, { form: 'editar', id, error: 'El nombre no puede ir vacío' });
		if (!COLOR_RE.test(color)) return fail(400, { form: 'editar', id, error: 'Color inválido' });
		if (password && password.length < 6) {
			return fail(400, { form: 'editar', id, error: 'La clave nueva debe tener al menos 6 caracteres' });
		}
		const logo = await readLogo(fd.get('logo'));
		if (typeof logo === 'string') return fail(400, { form: 'editar', id, error: logo });

		await updateClient(client, {
			name,
			color,
			password: password || null,
			logo,
			removeLogo: fd.get('removeLogo') === 'on'
		});
		return { form: 'editar', id, ok: 'Cambios guardados' };
	},

	borrar: async ({ request, locals }) => {
		if (!locals.authed) return fail(401, { form: 'borrar', error: 'Sin permiso' });
		const id = text(await request.formData(), 'id');
		const client = await getClientById(id);
		if (client) await deleteClient(client);
		return { form: 'borrar', ok: 'Negocio eliminado' };
	}
};
