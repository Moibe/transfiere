<script lang="ts">
	// Tarjeta de "escribe la clave". La usa la portada del dueño y el portal de cada negocio
	// (con su logo y nombre).
	import { enhance } from '$app/forms';
	import Icon from './Icon.svelte';

	type Props = {
		title?: string;
		subtitle?: string;
		logoUrl?: string | null;
		error?: string | null;
		action?: string;
	};
	let {
		title = 'Hola 👋',
		subtitle = 'Escribe la clave para mandar archivos.',
		logoUrl = null,
		error = null,
		action = '?/entrar'
	}: Props = $props();

	let entering = $state(false);
</script>

<div class="page">
	<section class="card gate">
		{#if logoUrl}
			<img class="gate-logo" src={logoUrl} alt="" />
		{:else}
			<div class="gate-ico"><Icon name="lock" size={26} /></div>
		{/if}
		<h1>{title}</h1>
		<p class="muted">{subtitle}</p>
		<form
			method="POST"
			{action}
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
			{#if error}
				<p class="error" role="alert">{error}</p>
			{/if}
			<button class="btn btn-primary" type="submit" disabled={entering}>
				{entering ? 'Un momento…' : 'Entrar'}
			</button>
		</form>
	</section>
</div>

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
		box-shadow: 0 10px 24px rgba(24, 24, 27, 0.18);
		margin-bottom: 0.4rem;
	}
	.gate-logo {
		max-width: 160px;
		max-height: 72px;
		object-fit: contain;
		margin-bottom: 0.6rem;
	}
	form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		margin-top: 1rem;
	}
</style>
