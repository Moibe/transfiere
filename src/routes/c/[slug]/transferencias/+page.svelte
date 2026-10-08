<script lang="ts">
	import TransferList from '$lib/components/TransferList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Transferencias · {data.client.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<TransferList
	transfers={data.transfers}
	clientSlug={data.client.slug}
	sendHref="/c/{data.client.slug}"
/>
