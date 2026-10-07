<script lang="ts">
	// Flujo completo de envío: elegir archivos → opciones → subir por chunks con progreso →
	// link listo para copiar/compartir.
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { fileExt, formatBytes, formatEta, formatSpeed, pluralFiles } from '$lib/format';
	import {
		uploadTransfer,
		UploadAborted,
		type ProgressInfo,
		type UploadResult
	} from '$lib/upload';
	import CopyButton from './CopyButton.svelte';
	import Icon from './Icon.svelte';

	type Phase = 'idle' | 'uploading' | 'done' | 'error';

	const EXPIRY_OPTIONS = [
		{ days: 1, label: '1 día' },
		{ days: 3, label: '3 días' },
		{ days: 7, label: '7 días' },
		{ days: 14, label: '14 días' },
		{ days: 30, label: '30 días' }
	];

	let phase = $state<Phase>('idle');
	let files = $state<File[]>([]);
	let message = $state('');
	let days = $state(7);
	let dragging = $state(false);
	let progress = $state<ProgressInfo | null>(null);
	let result = $state<UploadResult | null>(null);
	let errorMsg = $state('');
	let input = $state<HTMLInputElement | null>(null);
	let controller: AbortController | null = null;

	const totalSize = $derived(files.reduce((acc, f) => acc + f.size, 0));
	const percent = $derived(progress ? Math.min(100, Math.floor(progress.percent)) : 0);
	const currentName = $derived(progress ? (files[progress.currentIndex]?.name ?? '') : '');
	const expiryLabel = $derived(
		EXPIRY_OPTIONS.find((o) => o.days === days)?.label ?? `${days} días`
	);
	const waText = $derived(
		result ? `${message.trim() ? message.trim() + ' ' : ''}${result.url}` : ''
	);

	// Anillo de progreso (SVG)
	const R = 54;
	const CIRC = 2 * Math.PI * R;

	function addFiles(list: FileList | File[] | null | undefined) {
		if (!list) return;
		const next = [...files];
		for (const f of Array.from(list)) {
			const dup = next.some(
				(x) => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified
			);
			if (!dup) next.push(f);
		}
		files = next;
	}
	function removeFile(i: number) {
		files = files.filter((_, idx) => idx !== i);
	}
	function pick() {
		input?.click();
	}
	function onPick(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		addFiles(el.files);
		el.value = '';
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		addFiles(e.dataTransfer?.files);
	}
	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}
	function onDragLeave() {
		dragging = false;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			pick();
		}
	}

	async function start() {
		if (!files.length || phase === 'uploading') return;
		phase = 'uploading';
		errorMsg = '';
		result = null;
		progress = {
			loaded: 0,
			total: totalSize,
			percent: 0,
			speed: 0,
			eta: Infinity,
			currentIndex: 0,
			files: files.map((f) => ({ name: f.name, size: f.size, uploaded: 0, status: 'waiting' }))
		};
		controller = new AbortController();
		try {
			result = await uploadTransfer({
				files,
				message,
				days,
				signal: controller.signal,
				onProgress: (p) => (progress = p)
			});
			phase = 'done';
		} catch (e) {
			if (e instanceof UploadAborted) {
				phase = 'idle';
				progress = null;
				return;
			}
			errorMsg = e instanceof Error ? e.message : 'Algo salió mal';
			phase = 'error';
		} finally {
			controller = null;
		}
	}
	function cancel() {
		controller?.abort();
	}
	function reset() {
		phase = 'idle';
		files = [];
		message = '';
		days = 7;
		progress = null;
		result = null;
		errorMsg = '';
	}

	// Aviso del navegador si intentan cerrar la pestaña a media subida.
	onMount(() => {
		const warn = (e: BeforeUnloadEvent) => {
			if (phase === 'uploading') e.preventDefault();
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	});
</script>

<div class="page">
	{#if phase === 'idle' || phase === 'error'}
		<section class="hero" in:fade={{ duration: 180 }}>
			<h1>Manda archivos <span class="text-grad">pesados</span> sin drama.</h1>
			<p class="muted">Súbelos, copia el link y mándaselo. Así de fácil.</p>
		</section>

		<section class="card uploader">
			<div
				class="dropzone"
				class:dragging
				class:filled={files.length > 0}
				role="button"
				tabindex="0"
				aria-label="Elegir archivos"
				onclick={pick}
				onkeydown={onKey}
				ondrop={onDrop}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
			>
				<input
					bind:this={input}
					type="file"
					multiple
					hidden
					onchange={onPick}
					onclick={(e) => e.stopPropagation()}
				/>
				<div class="drop-ico"><Icon name="upload-cloud" size={30} /></div>
				<p class="drop-title">
					{files.length ? 'Agrega más archivos' : 'Arrastra tus archivos aquí'}
				</p>
				<p class="drop-sub muted">o haz clic para elegirlos · sin límite de tamaño</p>
			</div>

			{#if files.length}
				<ul class="files">
					{#each files as f, i (f.name + f.size + f.lastModified)}
						<li in:fly={{ y: 6, duration: 160 }}>
							<span class="f-ext">{fileExt(f.name) || 'file'}</span>
							<span class="f-name" title={f.name}>{f.name}</span>
							<span class="f-size muted">{formatBytes(f.size)}</span>
							<button
								class="f-remove"
								type="button"
								aria-label="Quitar {f.name}"
								onclick={() => removeFile(i)}
							>
								<Icon name="x" size={16} />
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="options">
				<label class="opt-msg">
					<span class="label">Mensajito (opcional)</span>
					<textarea
						class="textarea"
						bind:value={message}
						maxlength="1000"
						rows="3"
						placeholder="Para que sepa qué le estás mandando…"
					></textarea>
				</label>
				<label class="opt-exp">
					<span class="label">El link expira en</span>
					<select class="select" bind:value={days}>
						{#each EXPIRY_OPTIONS as o (o.days)}
							<option value={o.days}>{o.label}</option>
						{/each}
					</select>
				</label>
			</div>

			{#if phase === 'error'}
				<div class="alert" role="alert">
					<Icon name="alert" size={18} />
					<span>{errorMsg}</span>
				</div>
			{/if}

			<button
				class="btn btn-primary btn-lg go"
				type="button"
				disabled={!files.length}
				onclick={start}
			>
				<Icon name="send" size={18} />
				{#if files.length}
					Transferir · {pluralFiles(files.length)} · {formatBytes(totalSize)}
				{:else}
					Transferir
				{/if}
			</button>
		</section>
	{:else if phase === 'uploading' && progress}
		<section class="card progress" in:fade={{ duration: 180 }}>
			<div class="ring-wrap">
				<!-- ojo: la clase NO puede llamarse "ring" (Tailwind la generaría como utilidad) -->
				<svg class="ring-svg" viewBox="0 0 128 128" aria-hidden="true">
					<defs>
						<linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="#ff2d75" />
							<stop offset="100%" stop-color="#ff7a1a" />
						</linearGradient>
					</defs>
					<circle class="ring-track" cx="64" cy="64" r={R} />
					<circle
						class="ring-bar"
						cx="64"
						cy="64"
						r={R}
						stroke="url(#ring-grad)"
						stroke-dasharray={CIRC}
						stroke-dashoffset={CIRC * (1 - percent / 100)}
					/>
				</svg>
				<div class="ring-label">
					<div class="pct-wrap"><span class="pct">{percent}</span><span class="pct-sign">%</span></div>
				</div>
			</div>
			<h2>Subiendo {progress.currentIndex + 1} de {files.length}</h2>
			<p class="now" title={currentName}>{currentName}</p>
			<p class="stats muted">
				{formatBytes(progress.loaded)} de {formatBytes(progress.total)} · {formatSpeed(progress.speed)}
				· {formatEta(progress.eta)}
			</p>
			<ul class="files compact">
				{#each progress.files as f, i (i)}
					<li class={f.status}>
						<span class="f-state">
							{#if f.status === 'done'}
								<Icon name="check" size={14} stroke={3} />
							{:else if f.status === 'uploading'}
								<span class="spin"></span>
							{:else}
								<Icon name="clock" size={14} />
							{/if}
						</span>
						<span class="f-name" title={f.name}>{f.name}</span>
						<span class="f-size muted">{formatBytes(f.size)}</span>
						<span class="bar">
							<span class="bar-fill" style="width:{f.size ? (f.uploaded / f.size) * 100 : 100}%"></span>
						</span>
					</li>
				{/each}
			</ul>
			<button class="btn btn-ghost cancel" type="button" onclick={cancel}>
				<Icon name="x" size={16} /> Cancelar
			</button>
		</section>
	{:else if phase === 'done' && result}
		<section class="card finished" in:fly={{ y: 10, duration: 220 }}>
			<div class="done-ico"><Icon name="check" size={30} stroke={3} /></div>
			<h2>¡Listo! Tu link está servido</h2>
			<p class="muted">
				{pluralFiles(files.length)} · {formatBytes(totalSize)} · expira en {expiryLabel}
			</p>
			<a class="linkbox" href={result.url} target="_blank" rel="noopener">{result.url}</a>
			<div class="actions">
				<CopyButton text={result.url} />
				<a
					class="btn btn-ghost"
					href="https://wa.me/?text={encodeURIComponent(waText)}"
					target="_blank"
					rel="noopener"
				>
					<Icon name="message-circle" size={18} /> Mandar por WhatsApp
				</a>
			</div>
			<button class="btn btn-ghost btn-sm again" type="button" onclick={reset}>
				<Icon name="plus" size={16} /> Nueva transferencia
			</button>
		</section>
	{/if}
</div>

<style>
	.hero {
		text-align: center;
		padding: 1.2rem 0 1.4rem;
	}
	.hero p {
		font-size: 1.05rem;
	}

	.uploader {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.dropzone {
		border: 2px dashed rgba(124, 58, 237, 0.35);
		border-radius: 14px;
		padding: 2.2rem 1rem;
		text-align: center;
		cursor: pointer;
		outline: none;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(245, 242, 255, 0.7));
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.15s ease;
	}
	.dropzone:hover,
	.dropzone:focus-visible {
		border-color: var(--vivid-violet);
		background: rgba(124, 58, 237, 0.05);
	}
	.dropzone.dragging {
		border-color: var(--vivid-pink);
		background: rgba(255, 45, 117, 0.06);
		transform: scale(1.01);
	}
	.dropzone.filled {
		padding: 1.2rem 1rem;
	}
	.drop-ico {
		width: 64px;
		height: 64px;
		margin: 0 auto 0.8rem;
		border-radius: 20px;
		display: grid;
		place-items: center;
		color: #fff;
		background: var(--brand-grad);
		box-shadow: 0 10px 24px rgba(255, 45, 117, 0.3);
	}
	.filled .drop-ico {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		margin-bottom: 0.5rem;
	}
	.drop-title {
		font-weight: 800;
		font-size: 1.1rem;
		color: var(--ink);
	}
	.drop-sub {
		font-size: 0.9rem;
		margin-top: 0.2rem;
	}

	.files {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.files li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.7rem;
		padding: 0.55rem 0.7rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--line);
	}
	.f-ext {
		font-size: 0.68rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #fff;
		background: linear-gradient(135deg, var(--vivid-violet), var(--vivid-cyan));
		padding: 0.3rem 0.45rem;
		border-radius: 7px;
		min-width: 2.4rem;
		text-align: center;
	}
	.f-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.f-size {
		font-size: 0.85rem;
		white-space: nowrap;
	}
	.f-remove {
		border: 0;
		background: transparent;
		color: var(--ink-muted);
		cursor: pointer;
		padding: 0.3rem;
		border-radius: 8px;
		display: inline-flex;
	}
	.f-remove:hover {
		background: rgba(255, 45, 117, 0.1);
		color: #be123c;
	}

	.options {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 180px;
		gap: 0.9rem;
	}
	@media (max-width: 560px) {
		.options {
			grid-template-columns: 1fr;
		}
	}
	.go {
		align-self: center;
		min-width: 60%;
	}

	.alert {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		background: rgba(255, 59, 92, 0.1);
		color: #be123c;
		font-weight: 600;
		font-size: 0.92rem;
	}

	/* ---- subiendo ---- */
	.progress {
		padding: 2rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}
	.ring-wrap {
		position: relative;
		width: 160px;
		height: 160px;
		margin-bottom: 0.6rem;
	}
	.ring-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}
	.ring-track {
		fill: none;
		stroke: rgba(24, 24, 27, 0.08);
		stroke-width: 10;
	}
	.ring-bar {
		fill: none;
		stroke-width: 10;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.25s ease;
	}
	.ring-label {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}
	.pct-wrap {
		display: flex;
		align-items: baseline;
	}
	.pct {
		font-size: 2.4rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--ink);
	}
	.pct-sign {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--ink-muted);
		margin-left: 2px;
	}
	.now {
		font-weight: 600;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.stats {
		font-size: 0.92rem;
	}
	.files.compact {
		width: 100%;
		margin-top: 1rem;
		text-align: left;
	}
	.files.compact li {
		grid-template-columns: auto minmax(0, 1fr) auto 110px;
	}
	.f-state {
		width: 20px;
		display: inline-flex;
		justify-content: center;
		color: var(--ink-muted);
	}
	li.done .f-state {
		color: #15803d;
	}
	.bar {
		height: 6px;
		border-radius: 999px;
		background: rgba(24, 24, 27, 0.08);
		overflow: hidden;
	}
	.bar-fill {
		display: block;
		height: 100%;
		background: var(--brand-grad);
		transition: width 0.2s ease;
	}
	.spin {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid rgba(124, 58, 237, 0.25);
		border-top-color: var(--vivid-violet);
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.cancel {
		margin-top: 1.2rem;
	}

	/* ---- listo ---- (se llama .finished para no chocar con li.done de la lista) */
	.finished {
		padding: 2rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.done-ico {
		width: 68px;
		height: 68px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		color: #fff;
		background: linear-gradient(135deg, #22c55e, #a3e635);
		box-shadow: 0 10px 26px rgba(34, 197, 94, 0.3);
		margin-bottom: 0.4rem;
	}
	.linkbox {
		display: block;
		width: 100%;
		box-sizing: border-box;
		margin-top: 0.9rem;
		padding: 0.85rem 1rem;
		border-radius: 12px;
		background: rgba(124, 58, 237, 0.07);
		border: 1px dashed rgba(124, 58, 237, 0.35);
		color: #5b21b6;
		font-weight: 700;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	.linkbox:hover {
		background: rgba(124, 58, 237, 0.11);
	}
	.actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.9rem;
	}
	.again {
		margin-top: 1rem;
	}
</style>
