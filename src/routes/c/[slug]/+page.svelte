<script lang="ts">
	import Gate from '$lib/components/Gate.svelte';
	import MadeBy from '$lib/components/MadeBy.svelte';
	import Uploader from '$lib/components/Uploader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.client.name} · Transfiere</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.clientAuthed}
	<Uploader clientSlug={data.client.slug} clientName={data.client.name} />
{:else}
	<Gate
		title={data.client.logoUrl ? 'Hola 👋' : data.client.name}
		subtitle="Escribe tu clave para mandar archivos."
		logoUrl={data.client.logoUrl}
		error={form?.error}
	/>
{/if}

<MadeBy />
