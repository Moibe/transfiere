// Cliente de subida por chunks (ver el PUT en src/routes/api/transfers/[tid]/files/[fid]).
//
// Flujo: POST /api/transfers (crea) → por cada archivo, PUT de pedazos de 16 MB en orden
// (XHR para tener progreso real) → POST /finish. Si un chunk falla se reintenta con backoff
// y, antes de reintentar, se le pregunta al server cuántos bytes tiene para retomar justo ahí.

export const CHUNK_SIZE = 16 * 1024 * 1024;
const MAX_ATTEMPTS = 6;

export type FileStatus = 'waiting' | 'uploading' | 'done' | 'error';
export type FileProgress = { name: string; size: number; uploaded: number; status: FileStatus };
export type ProgressInfo = {
	loaded: number;
	total: number;
	percent: number;
	/** bytes/s (promedio de los últimos segundos) */
	speed: number;
	/** segundos restantes estimados; Infinity si aún no se puede estimar */
	eta: number;
	currentIndex: number;
	files: FileProgress[];
};
export type UploadResult = { id: string; url: string };
export type UploadOptions = {
	files: File[];
	message: string;
	days: number;
	signal: AbortSignal;
	onProgress: (p: ProgressInfo) => void;
};

export class UploadAborted extends Error {
	constructor() {
		super('Subida cancelada');
		this.name = 'UploadAborted';
	}
}

class ChunkError extends Error {
	constructor(
		public status: number,
		message: string,
		public uploaded?: number
	) {
		super(message);
		this.name = 'ChunkError';
	}
}

type CreatedTransfer = { id: string; files: { id: string; name: string; size: number }[] };

class SpeedMeter {
	private samples: { t: number; loaded: number }[] = [];
	private last = 0;
	push(loaded: number): number {
		const now = performance.now();
		this.samples.push({ t: now, loaded });
		while (this.samples.length > 2 && now - this.samples[0].t > 5000) this.samples.shift();
		const first = this.samples[0];
		const dt = (now - first.t) / 1000;
		if (dt < 0.5) return this.last;
		this.last = Math.max(0, (loaded - first.loaded) / dt);
		return this.last;
	}
}

function throwIfAborted(signal: AbortSignal) {
	if (signal.aborted) throw new UploadAborted();
}

function sleep(ms: number, signal: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		const t = setTimeout(resolve, ms);
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(t);
				reject(new UploadAborted());
			},
			{ once: true }
		);
	});
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
	try {
		const j = (await res.json()) as { message?: string };
		if (j?.message) return j.message;
	} catch {
		/* sin JSON */
	}
	return `${fallback} (HTTP ${res.status})`;
}

async function createTransfer(opts: UploadOptions): Promise<CreatedTransfer> {
	const res = await fetch('/api/transfers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal: opts.signal,
		body: JSON.stringify({
			message: opts.message,
			days: opts.days,
			files: opts.files.map((f) => ({ name: f.name, size: f.size, type: f.type }))
		})
	});
	if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear la transferencia'));
	return res.json();
}

async function fetchUploaded(tid: string, fid: string, signal: AbortSignal): Promise<number> {
	const res = await fetch(`/api/transfers/${tid}/files/${fid}`, { signal, cache: 'no-store' });
	if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo consultar el avance'));
	const j = (await res.json()) as { uploaded: number };
	return j.uploaded;
}

async function finish(tid: string, signal: AbortSignal): Promise<void> {
	const res = await fetch(`/api/transfers/${tid}/finish`, { method: 'POST', signal });
	if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cerrar la transferencia'));
}

function sendChunk(
	url: string,
	blob: Blob,
	signal: AbortSignal,
	onLoaded: (loaded: number) => void
): Promise<{ uploaded: number; complete: boolean }> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.responseType = 'json';
		xhr.setRequestHeader('Content-Type', 'application/octet-stream');
		xhr.upload.onprogress = (e) => onLoaded(e.loaded);
		xhr.onload = () => {
			const body = (xhr.response ?? {}) as { message?: string; uploaded?: number; complete?: boolean };
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve({ uploaded: body.uploaded ?? 0, complete: Boolean(body.complete) });
			} else {
				reject(new ChunkError(xhr.status, body.message ?? `HTTP ${xhr.status}`, body.uploaded));
			}
		};
		xhr.onerror = () => reject(new Error('error de red'));
		xhr.ontimeout = () => reject(new Error('tiempo de espera agotado'));
		xhr.onabort = () => reject(new UploadAborted());
		const onAbort = () => xhr.abort();
		signal.addEventListener('abort', onAbort, { once: true });
		xhr.onloadend = () => signal.removeEventListener('abort', onAbort);
		xhr.send(blob);
	});
}

export async function uploadTransfer(opts: UploadOptions): Promise<UploadResult> {
	const { files, signal } = opts;
	const total = files.reduce((acc, f) => acc + f.size, 0);
	const states: FileProgress[] = files.map((f) => ({
		name: f.name,
		size: f.size,
		uploaded: 0,
		status: 'waiting'
	}));
	const meter = new SpeedMeter();
	let doneBytes = 0;
	let current = 0;

	// `fileLoaded` = bytes del archivo actual que ya salieron (offset + avance del chunk en curso).
	const report = (fileLoaded: number) => {
		const state = states[current];
		if (state) state.uploaded = Math.min(state.size, fileLoaded);
		const loaded = Math.min(total, doneBytes + fileLoaded);
		const speed = meter.push(loaded);
		opts.onProgress({
			loaded,
			total,
			percent: total ? (loaded / total) * 100 : 100,
			speed,
			eta: speed > 0 ? (total - loaded) / speed : Infinity,
			currentIndex: current,
			files: states.map((s) => ({ ...s }))
		});
	};

	throwIfAborted(signal);
	const created = await createTransfer(opts);

	try {
		for (current = 0; current < files.length; current++) {
			const file = files[current];
			const remote = created.files[current];
			states[current].status = 'uploading';
			report(0);

			let offset = 0;
			let attempts = 0;
			while (offset < file.size) {
				throwIfAborted(signal);
				const end = Math.min(offset + CHUNK_SIZE, file.size);
				const url = `/api/transfers/${created.id}/files/${remote.id}?offset=${offset}&length=${end - offset}`;
				try {
					const res = await sendChunk(url, file.slice(offset, end), signal, (loaded) =>
						report(offset + loaded)
					);
					offset = res.uploaded;
					attempts = 0;
				} catch (e) {
					if (e instanceof UploadAborted || signal.aborted) throw new UploadAborted();
					attempts++;
					if (attempts >= MAX_ATTEMPTS) {
						states[current].status = 'error';
						const why = e instanceof Error ? e.message : 'error desconocido';
						throw new Error(`No se pudo subir «${file.name}» tras ${MAX_ATTEMPTS} intentos (${why})`);
					}
					// El server dijo exactamente cuántos bytes tiene: retomar ahí, sin esperar.
					if (e instanceof ChunkError && typeof e.uploaded === 'number') {
						offset = e.uploaded;
						continue;
					}
					await sleep(Math.min(1000 * 2 ** (attempts - 1), 8000), signal);
					offset = await fetchUploaded(created.id, remote.id, signal).catch(() => offset);
				}
			}

			states[current].status = 'done';
			report(file.size);
			doneBytes += file.size;
		}

		await finish(created.id, signal);
		return { id: created.id, url: `${location.origin}/t/${created.id}` };
	} catch (e) {
		if (e instanceof UploadAborted || signal.aborted) {
			// Limpieza de cortesía: borra lo que alcanzó a subir (sin esperar la respuesta).
			fetch(`/api/transfers/${created.id}`, { method: 'DELETE', keepalive: true }).catch(() => {});
			throw new UploadAborted();
		}
		throw e;
	}
}
