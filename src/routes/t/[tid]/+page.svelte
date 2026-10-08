<script lang="ts">
	// Página pública del link: aquí aterriza quien recibe los archivos.
	import { invalidateAll } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import MadeBy from '$lib/components/MadeBy.svelte';
	import { fileExt, formatBytes, formatDate, formatRemaining, pluralFiles } from '$lib/format';
	import type { PublicFile } from '$lib/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const t = $derived(data.transfer);
	const ready = $derived(t.status === 'ready');
	const downloadUrl = (f: PublicFile) => `/d/${t.id}/${f.id}/${encodeURIComponent(f.name)}`;

	// Mientras siguen subiendo, la página se refresca sola cada pocos segundos.
	$effect(() => {
		if (ready) return;
		const timer = setInterval(() => invalidateAll(), 4000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>
		{pluralFiles(t.files.length)} para ti · {data.client ? data.client.name : 'Transfiere'}
	</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<section class="card receive">
		{#if !data.client?.logoUrl}
			<div class="hero-ico" class:pending={!ready}>
				<Icon name={ready ? 'download' : 'upload-cloud'} size={30} />
			</div>
		{/if}
		{#if data.client}
			<p class="sender">
				{#if data.client.logoUrl}
					<img class="sender-logo" src={data.client.logoUrl} alt={data.client.name} />
				{/if}
				<span><strong>{data.client.name}</strong> te envió</span>
			</p>
		{/if}
		<h1>
			{#if ready}
				Tienes {pluralFiles(t.files.length)} <span class="text-grad">esperándote</span>
			{:else}
				Tus archivos vienen en camino
			{/if}
		</h1>
		<p class="muted sub">
			{formatBytes(t.totalSize)} · el link expira {formatRemaining(t.expiresAt)} ({formatDate(
				t.expiresAt
			)})
		</p>

		{#if t.message}
			<blockquote class="message">{t.message}</blockquote>
		{/if}

		{#if !ready}
			<p class="uploading-note"><span class="dot"></span> Todavía se están subiendo… esta página se actualiza sola.</p>
		{/if}

		<ul class="files">
			{#each t.files as f (f.id)}
				<li>
					<span class="f-ext">{fileExt(f.name) || 'file'}</span>
					<div class="f-meta">
						<span class="f-name" title={f.name}>{f.name}</span>
						<span class="f-size muted">
							{formatBytes(f.size)}
							{#if !f.complete}
								· subiendo {f.size ? Math.floor((f.uploaded / f.size) * 100) : 0}%
							{/if}
						</span>
					</div>
					{#if f.complete}
						<a class="btn btn-ghost btn-sm" href={downloadUrl(f)} download={f.name}>
							<Icon name="download" size={16} /> Descargar
						</a>
					{:else}
						<span class="chip uploading">en camino</span>
					{/if}
				</li>
			{/each}
		</ul>

		{#if ready}
			{#if t.files.length > 1}
				<a class="btn btn-primary btn-lg all" href="/d/{t.id}/todo.zip">
					<Icon name="download" size={18} /> Descargar todo (.zip)
				</a>
			{:else}
				<a class="btn btn-primary btn-lg all" href={downloadUrl(t.files[0])} download={t.files[0].name}>
					<Icon name="download" size={18} /> Descargar
				</a>
			{/if}
		{/if}
	</section>
	<MadeBy />
</div>

<style>
	.receive {
		margin-top: 1rem;
		padding: 2rem 1.5rem 1.6rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.hero-ico {
		width: 68px;
		height: 68px;
		border-radius: 22px;
		display: grid;
		place-items: center;
		color: #fff;
		background: var(--brand-grad);
		box-shadow: 0 10px 26px rgba(255, 45, 117, 0.3);
		margin-bottom: 0.4rem;
	}
	.sender {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		color: var(--ink-soft);
		font-size: 0.95rem;
		margin-bottom: 0.2rem;
	}
	.sender-logo {
		max-width: 180px;
		max-height: 64px;
		object-fit: contain;
	}
	.hero-ico.pending {
		background: linear-gradient(135deg, var(--vivid-violet), var(--vivid-cyan));
		box-shadow: 0 10px 26px rgba(124, 58, 237, 0.3);
	}
	.sub {
		font-size: 0.95rem;
	}
	.message {
		margin: 0.9rem 0 0.2rem;
		padding: 0.9rem 1.1rem;
		border-radius: 14px;
		background: rgba(255, 204, 31, 0.16);
		border: 1px solid rgba(255, 204, 31, 0.45);
		color: var(--ink);
		font-size: 1rem;
		line-height: 1.5;
		white-space: pre-wrap;
		max-width: 100%;
		box-sizing: border-box;
	}
	.uploading-note {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: #c2410c;
		margin-top: 0.4rem;
	}
	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--vivid-orange);
		animation: pulse 1.2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.35;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.files {
		list-style: none;
		margin: 1.2rem 0 0;
		padding: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		text-align: left;
	}
	.files li {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.8rem;
		padding: 0.65rem 0.8rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.72);
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
	.f-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.f-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.f-size {
		font-size: 0.82rem;
	}
	.all {
		margin-top: 1.3rem;
		min-width: 60%;
	}
	@media (max-width: 480px) {
		.files li {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.files li > :global(.btn),
		.files li > .chip {
			grid-column: 1 / -1;
			justify-self: stretch;
		}
	}
</style>
