import { error, json, type RequestHandler } from '@sveltejs/kit';
import { requireActor } from '$lib/server/clients';
import { createTransfer, DEFAULT_DAYS, MAX_FILES, type NewFileInput } from '$lib/server/transfers';

// POST /api/transfers — crea la transferencia y sus archivos (vacíos). Después el cliente
// sube cada archivo por chunks a /api/transfers/<tid>/files/<fid> y cierra con /finish.
export const POST: RequestHandler = async (event) => {
	const actor = await requireActor(event);

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		error(400, 'JSON inválido');
	}
	const b = (body ?? {}) as { message?: unknown; days?: unknown; files?: unknown };

	if (!Array.isArray(b.files) || b.files.length === 0) error(400, 'Manda al menos un archivo');
	if (b.files.length > MAX_FILES) error(400, `Máximo ${MAX_FILES} archivos por transferencia`);

	const inputs: NewFileInput[] = b.files.map((raw: unknown, i: number) => {
		const f = (raw ?? {}) as { name?: unknown; size?: unknown; type?: unknown };
		if (typeof f.name !== 'string' || !f.name.trim()) error(400, `El archivo #${i + 1} no trae nombre`);
		if (typeof f.size !== 'number' || !Number.isInteger(f.size) || f.size < 0) {
			error(400, `El archivo «${f.name}» trae un tamaño inválido`);
		}
		return {
			name: f.name,
			size: f.size,
			type: typeof f.type === 'string' && f.type ? f.type.slice(0, 120) : null
		};
	});

	const message =
		typeof b.message === 'string' ? b.message.trim().slice(0, 1000) || null : null;
	const days = typeof b.days === 'number' && Number.isFinite(b.days) ? b.days : DEFAULT_DAYS;

	const created = await createTransfer({
		message,
		days,
		files: inputs,
		clientId: actor.kind === 'client' ? actor.client.id : null
	});
	return json(created, { status: 201 });
};
