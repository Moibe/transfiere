<script lang="ts">
	// Lista de envíos: link, descargas por archivo y borrar (con modal propio). La usan el
	// dueño (todas, con el nombre del negocio) y el portal de cada negocio (solo las suyas).
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBytes, formatDateTime, formatRemaining, pluralFiles } from '$lib/format';
	import { clientHeaders } from '$lib/upload';
	import type { AdminTransfer } from '$lib/types';

	type Props = {
		transfers: AdminTransfer[];
		/** Portal de un negocio: borra como ese cliente. */
		clientSlug?: string;
		/** A dónde lleva "Enviar archivos" cuando no hay nada. */
		sendHref?: string;
	};
	let { transfers, clientSlug, sendHref = '/' }: Props = $props();

	let toDelete = $state<string | null>(null);
	let busy = $state(false);
	let errorMsg = $state('');

	const linkOf = (id: string) => `${page.url.origin}/t/${id}`;
	const totalDownloads = (t: AdminTransfer) => t.files.reduce((acc, f) => acc + f.downloads, 0);

	async function confirmDelete() {
		if (!toDelete) return;
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/transfers/${toDelete}`, {
				method: 'DELETE',
				headers: clientHeaders(clientSlug)
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => null)) as { message?: string } | null;
				throw new Error(body?.message ?? 'No se pudo borrar');
			}
			toDelete = null;
			await invalidateAll();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'No se pudo borrar';
		} finally {
			busy = false;
		}
	}
</script>

<div class="page wide">
	<header class="head">
		<h1>Tus <span class="text-grad">transferencias</span></h1>
		<p class="muted">
			{transfers.length === 0
				? 'Aquí aparecerá lo que mandes.'
				: `${pluralFiles(transfers.length).replace('archivo', 'envío')} · se borran solas al expirar`}
		</p>
	</header>

	{#if errorMsg}
		<p class="error" role="alert">{errorMsg}</p>
	{/if}

	{#if transfers.length === 0}
		<section class="card empty">
			<div class="empty-ico"><Icon name="send" size={26} /></div>
			<p>Todavía no has mandado nada.</p>
			<a class="btn btn-primary" href={sendHref}><Icon name="send" size={16} /> Enviar archivos</a>
		</section>
	{:else}
		<ul class="list">
			{#each transfers as t (t.id)}
				<li class="card tcard">
					<div class="t-top">
						<div class="t-info">
							<p class="t-date">
								{formatDateTime(t.createdAt)}
								<span class="chip {t.status}">{t.status === 'ready' ? 'lista' : 'incompleta'}</span>
								<span class="chip neutral">expira {formatRemaining(t.expiresAt)}</span>
								{#if t.clientName}
									<span class="chip client">{t.clientName}</span>
								{/if}
							</p>
							{#if t.message}
								<p class="t-msg">“{t.message}”</p>
							{/if}
						</div>
						<div class="t-actions">
							<CopyButton text={linkOf(t.id)} class="btn btn-ghost btn-sm" />
							<a class="btn btn-ghost btn-sm" href="/t/{t.id}" target="_blank" rel="noopener">
								<Icon name="external" size={16} /> Abrir
							</a>
							<button class="btn btn-ghost btn-sm del" type="button" onclick={() => (toDelete = t.id)}>
								<Icon name="trash" size={16} /> Borrar
							</button>
						</div>
					</div>

					<ul class="t-files">
						{#each t.files as f (f.id)}
							<li>
								<span class="f-name" title={f.name}>{f.name}</span>
								<span class="f-size muted">{formatBytes(f.size)}</span>
								<span
									class="dl"
									class:yes={f.downloads > 0}
									title={f.lastDownloadAt ? `última descarga: ${formatDateTime(f.lastDownloadAt)}` : ''}
								>
									{#if f.downloads > 0}
										<Icon name="check" size={14} stroke={3} />
										{f.downloads === 1 ? 'descargado' : `${f.downloads}× descargado`}
									{:else if !f.complete}
										sin terminar de subir
									{:else}
										sin descargar
									{/if}
								</span>
							</li>
						{/each}
					</ul>

					<p class="t-sum muted">
						{pluralFiles(t.files.length)} · {formatBytes(t.totalSize)} · {totalDownloads(t)} descargas
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<ConfirmModal
	open={toDelete !== null}
	title="¿Borrar esta transferencia?"
	message="Se eliminan los archivos del servidor y el link deja de funcionar. No hay vuelta atrás."
	{busy}
	onconfirm={confirmDelete}
	oncancel={() => (toDelete = null)}
/>

<style>
	.head {
		padding: 0.8rem 0 1.2rem;
	}
	.empty {
		padding: 2.4rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}
	.empty-ico {
		width: 56px;
		height: 56px;
		border-radius: 18px;
		display: grid;
		place-items: center;
		color: #fff;
		background: var(--brand-grad);
		box-shadow: 0 10px 24px rgba(255, 45, 117, 0.3);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.tcard {
		padding: 1.1rem 1.2rem;
	}
	.t-top {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		flex-wrap: wrap;
	}
	.t-info {
		min-width: 0;
		flex: 1 1 260px;
	}
	.t-date {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-weight: 700;
		color: var(--ink);
	}
	.t-msg {
		margin-top: 0.4rem;
		color: var(--ink-soft);
		font-style: italic;
		overflow-wrap: anywhere;
	}
	.t-actions {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
	}
	.chip.client {
		background: rgba(25, 199, 255, 0.14);
		color: #0369a1;
	}
	.del:hover {
		color: #be123c;
		border-color: rgba(190, 18, 60, 0.35);
		background: rgba(255, 59, 92, 0.07);
	}

	.t-files {
		list-style: none;
		margin: 0.9rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.t-files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 0.8rem;
		padding: 0.5rem 0.7rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--line);
		font-size: 0.92rem;
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
	.dl {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--ink-muted);
		white-space: nowrap;
	}
	.dl.yes {
		color: #15803d;
	}
	.t-sum {
		margin-top: 0.7rem;
		font-size: 0.85rem;
	}
	@media (max-width: 480px) {
		.t-files li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.t-files li .dl {
			grid-column: 1 / -1;
		}
	}
</style>
