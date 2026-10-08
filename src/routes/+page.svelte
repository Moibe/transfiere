<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import MadeBy from '$lib/components/MadeBy.svelte';
	import Uploader from '$lib/components/Uploader.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let entering = $state(false);
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
	<div class="page">
		<section class="card gate">
			<div class="gate-ico"><Icon name="lock" size={26} /></div>
			<h1>Hola 👋</h1>
			<p class="muted">Escribe la clave para mandar archivos.</p>
			<form
				method="POST"
				action="?/entrar"
				use:enhance={() => {
					entering = true;
					return async ({ update }) => {
						await update();
						entering = false;
					};
				}}
			>
				<input
					class="input"
					type="password"
					name="clave"
					placeholder="Clave"
					autocomplete="current-password"
					required
				/>
				{#if form?.error}
					<p class="error" role="alert">{form.error}</p>
				{/if}
				<button class="btn btn-primary" type="submit" disabled={entering}>
					{entering ? 'Un momento…' : 'Entrar'}
				</button>
			</form>
		</section>
	</div>
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
		background: var(--brand-grad);
		box-shadow: 0 10px 24px rgba(255, 45, 117, 0.3);
		margin-bottom: 0.4rem;
	}
	.gate-ico.warn {
		background: linear-gradient(135deg, #f59e0b, #ff7a1a);
		box-shadow: 0 10px 24px rgba(245, 158, 11, 0.3);
	}
	form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin-top: 1rem;
	}
	code {
		font-size: 0.9em;
		background: rgba(24, 24, 27, 0.06);
		padding: 0.1rem 0.35rem;
		border-radius: 6px;
	}
</style>
