<script lang="ts">
	// Tailwind v4 + tokens de shadcn. El fondo blanco + orbs y los :global(body) de abajo GANAN:
	// los estilos :global de Svelte van sin @layer, así que pisan el @layer base de Tailwind.
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { brandStyle } from '$lib/brand';
	import Orbs from '$lib/components/Orbs.svelte';
	import TopNav from '$lib/components/TopNav.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Páginas de un negocio (su portal y los links que manda): su color pinta toda la marca.
	const themeStyle = $derived(brandStyle(page.data.client?.color));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="theme" style={themeStyle}>
	<Orbs />
	<TopNav authed={data.authed} />
	<main>
		<div class="work-scroll">
			{@render children()}
		</div>
	</main>
</div>

<style>
	:global(:root) {
		--topnav-height: 64px;
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
	}
	:global(body) {
		min-height: 100vh;
		background: linear-gradient(135deg, var(--grad-a) 0%, var(--grad-b) 100%);
		background-attachment: fixed;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	/* Scrollbars custom: pastilla redondeada sobre el panel blanco. */
	:global(*) {
		scrollbar-width: auto;
		scrollbar-color: rgba(24, 24, 27, 0.28) rgba(24, 24, 27, 0.06);
	}
	:global(::-webkit-scrollbar) {
		width: 14px;
		height: 14px;
	}
	:global(::-webkit-scrollbar-track) {
		background: rgba(24, 24, 27, 0.05);
		border-radius: 999px;
	}
	:global(::-webkit-scrollbar-thumb) {
		background: rgba(24, 24, 27, 0.28);
		border-radius: 999px;
		border: 3px solid transparent;
		background-clip: padding-box;
	}
	:global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(24, 24, 27, 0.45);
		background-clip: padding-box;
	}

	.theme {
		display: contents;
	}

	/* Panel principal glass (blanco) — mismo lenguaje que la barra. A todo el ancho. */
	main {
		position: fixed;
		top: calc(2rem + var(--topnav-height));
		left: 1rem;
		right: 1rem;
		bottom: 1rem;
		box-sizing: border-box;
		z-index: 1;
		background: var(--glass);
		backdrop-filter: blur(18px) saturate(150%);
		-webkit-backdrop-filter: blur(18px) saturate(150%);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-panel);
		box-shadow: var(--shadow);
		overflow: hidden;
	}

	.work-scroll {
		position: absolute;
		top: 16px;
		bottom: 16px;
		left: 0;
		right: 0;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0 16px;
	}

	@media (max-width: 680px) {
		main {
			top: calc(1.2rem + var(--topnav-height));
			left: 0.6rem;
			right: 0.6rem;
			bottom: 0.6rem;
		}
		.work-scroll {
			padding: 0 12px;
		}
	}
</style>
