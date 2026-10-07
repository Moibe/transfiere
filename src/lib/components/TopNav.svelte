<script lang="ts">
	// Barra superior "de vidrio" (versión blanca) con tilt 3D al pasar el mouse + responsive
	// (en móvil colapsa a solo-íconos). Los items solo se muestran con la clave puesta: quien
	// recibe un link ve nada más la marca.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	let { authed = false }: { authed?: boolean } = $props();

	let tiltX = $state(0);
	let tiltY = $state(0);

	function handleMove(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
		const MAX = 1.2;
		tiltX = -ny * MAX;
		tiltY = nx * MAX;
	}
	function handleLeave() {
		tiltX = 0;
		tiltY = 0;
	}

	const items = [
		{ href: '/', label: 'Enviar', icon: 'send' },
		{ href: '/transferencias', label: 'Transferencias', icon: 'list' }
	];
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header
	class="topnav"
	style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
	onmousemove={handleMove}
	onmouseleave={handleLeave}
>
	<a href="/" class="brand" aria-label="Inicio">
		<span class="brand-ico" aria-hidden="true"><Icon name="arrow-up" size={14} stroke={3} /></span>
		<span class="brand-title text-grad">Transfiere</span>
	</a>

	{#if authed}
		<nav class="topnav-nav">
			{#each items as it (it.href)}
				<a
					href={it.href}
					class="nav-item"
					aria-current={page.url.pathname === it.href ? 'page' : undefined}
				>
					<span class="nav-ico" aria-hidden="true"><Icon name={it.icon} size={16} /></span>
					<span class="nav-label">{it.label}</span>
				</a>
			{/each}
		</nav>
		<form class="salir" method="POST" action="/?/salir" use:enhance>
			<button class="nav-item" type="submit" title="Salir">
				<span class="nav-ico" aria-hidden="true"><Icon name="logout" size={16} /></span>
				<span class="nav-label">Salir</span>
			</button>
		</form>
	{/if}
</header>

<style>
	.topnav {
		position: fixed;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		height: var(--topnav-height, 64px);
		padding: 0 1.25rem;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		background: var(--glass);
		backdrop-filter: blur(18px) saturate(150%);
		-webkit-backdrop-filter: blur(18px) saturate(150%);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-panel);
		box-shadow: var(--shadow);
		transition: transform 0.18s ease-out;
		will-change: transform;
		user-select: none;
		z-index: 9;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		color: var(--ink);
		text-decoration: none;
		border-radius: 10px;
		padding: 0.25rem 0.4rem;
		transition: background 0.18s ease;
	}
	.brand:hover {
		background: rgba(24, 24, 27, 0.04);
	}
	.brand-ico {
		width: 26px;
		height: 26px;
		border-radius: 8px;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		background: var(--brand-grad);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.4),
			0 4px 12px rgba(255, 45, 117, 0.35);
	}
	.brand-title {
		font-size: 1.25rem;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.topnav-nav {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: 1.25rem;
		padding-left: 1.25rem;
		border-left: 1px solid var(--line);
	}
	.salir {
		margin-left: auto;
	}

	.nav-item {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.8rem;
		color: var(--ink-soft);
		text-decoration: none;
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		border-radius: 10px;
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease,
			color 0.18s ease;
		white-space: nowrap;
	}
	.nav-item:hover {
		background: rgba(24, 24, 27, 0.05);
		border-color: var(--line);
		color: var(--ink);
	}
	.nav-item[aria-current='page'] {
		color: #5b21b6;
		background: rgba(124, 58, 237, 0.1);
		border-color: rgba(124, 58, 237, 0.3);
	}
	.nav-ico {
		display: inline-flex;
		flex-shrink: 0;
	}

	/* En pantallas chicas: solo íconos (oculta texto y título) para que no se desborde. */
	@media (max-width: 680px) {
		.topnav {
			top: 0.6rem;
			left: 0.6rem;
			right: 0.6rem;
			padding: 0 0.6rem;
		}
		.brand {
			gap: 0;
			padding: 0.25rem;
		}
		.brand-title {
			display: none;
		}
		.topnav-nav {
			margin-left: 0.5rem;
			padding-left: 0.5rem;
			gap: 0.1rem;
		}
		.nav-item {
			padding: 0.45rem 0.5rem;
		}
		.nav-label {
			display: none;
		}
	}
</style>
