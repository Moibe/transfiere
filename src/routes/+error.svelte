<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{page.status} · Transfiere</title>
</svelte:head>

<div class="page">
	<section class="card err">
		<div class="err-ico"><Icon name={notFound ? 'clock' : 'alert'} size={28} /></div>
		<p class="code">{page.status}</p>
		<h1>{page.error?.message ?? 'Algo salió mal'}</h1>
		<p class="muted">
			{#if notFound}
				Los links de Transfiere caducan solos. Si lo necesitas, pide que te lo vuelvan a mandar.
			{:else}
				Inténtalo de nuevo en un momento.
			{/if}
		</p>
		<a class="btn btn-ghost" href="/"><Icon name="arrow-left" size={16} /> Ir al inicio</a>
	</section>
</div>

<style>
	.err {
		margin-top: 2rem;
		padding: 2.4rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.err-ico {
		width: 64px;
		height: 64px;
		border-radius: 20px;
		display: grid;
		place-items: center;
		color: #fff;
		background: linear-gradient(135deg, var(--vivid-violet), var(--vivid-cyan));
		box-shadow: 0 10px 24px rgba(124, 58, 237, 0.3);
	}
	.code {
		font-weight: 800;
		letter-spacing: 0.1em;
		color: var(--ink-muted);
		font-size: 0.85rem;
		margin-top: 0.4rem;
	}
	.err .btn {
		margin-top: 1rem;
	}
</style>
