<script lang="ts">
	import Gate from '$lib/components/Gate.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import MadeBy from '$lib/components/MadeBy.svelte';
	import Uploader from '$lib/components/Uploader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Transfiere</title>
</svelte:head>

{#if !data.configured}
	<div class="page">
		<section class="card gate">
			<div class="gate-ico warn"><Icon name="alert" size={26} /></div>
			<h1>Falta configurar la clave</h1>
			<p class="muted">
				Agrega <code>UPLOAD_PASSWORD=…</code> al <code>.env</code> del servidor y reinicia la app.
			</p>
		</section>
	</div>
{:else if !data.authed}
	<Gate error={form?.error} />
{:else}
	<Uploader />
{/if}

<MadeBy />

<style>
	.gate {
		margin: 2.5rem auto 0;
		max-width: 420px;
		padding: 2.2rem 1.6rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.gate-ico {
		width: 60px;
		height: 60px;
		border-radius: 20px;
		display: grid;
		place-items: center;
		color: #fff;
		background: linear-gradient(135deg, #f59e0b, #ff7a1a);
		box-shadow: 0 10px 24px rgba(245, 158, 11, 0.3);
		margin-bottom: 0.4rem;
	}
	code {
		font-size: 0.9em;
		background: rgba(24, 24, 27, 0.06);
		padding: 0.1rem 0.35rem;
		border-radius: 6px;
	}
</style>
