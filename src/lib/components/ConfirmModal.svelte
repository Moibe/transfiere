<script lang="ts">
	// Modal de confirmación propio (nada de confirm() del navegador), con el mismo lenguaje
	// glass/blanco del resto del sitio.
	import { fade, scale } from 'svelte/transition';
	import Icon from './Icon.svelte';

	type Props = {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		busy?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	};
	let {
		open,
		title,
		message,
		confirmLabel = 'Sí, borrar',
		cancelLabel = 'Cancelar',
		danger = true,
		busy = false,
		onconfirm,
		oncancel
	}: Props = $props();

	let cancelBtn = $state<HTMLButtonElement | null>(null);
	$effect(() => {
		if (open) cancelBtn?.focus();
	});

	function close() {
		if (!busy) oncancel();
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
	<div class="overlay" role="presentation" transition:fade={{ duration: 140 }} onclick={close}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
		<div
			class="modal card"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-title"
			tabindex="-1"
			transition:scale={{ start: 0.96, duration: 160 }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="modal-ico" class:danger>
				<Icon name={danger ? 'trash' : 'alert'} size={22} />
			</div>
			<h3 id="confirm-title">{title}</h3>
			<p class="muted">{message}</p>
			<div class="modal-actions">
				<button class="btn btn-ghost" bind:this={cancelBtn} onclick={close} disabled={busy}>
					{cancelLabel}
				</button>
				<button class="btn {danger ? 'btn-danger' : 'btn-primary'}" onclick={onconfirm} disabled={busy}>
					{busy ? 'Un momento…' : confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(24, 24, 27, 0.28);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}
	.modal {
		width: min(440px, 100%);
		padding: 1.6rem 1.5rem 1.4rem;
		background: rgba(255, 255, 255, 0.96);
		text-align: center;
		box-shadow: var(--shadow);
	}
	.modal-ico {
		width: 52px;
		height: 52px;
		margin: 0 auto 0.9rem;
		border-radius: 16px;
		display: grid;
		place-items: center;
		color: #5b21b6;
		background: rgba(124, 58, 237, 0.12);
	}
	.modal-ico.danger {
		color: #be123c;
		background: rgba(255, 59, 92, 0.12);
	}
	h3 {
		margin: 0 0 0.4rem;
		font-size: 1.2rem;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--ink);
	}
	p {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.modal-actions {
		display: flex;
		gap: 0.6rem;
		justify-content: center;
		margin-top: 1.3rem;
		flex-wrap: wrap;
	}
</style>
