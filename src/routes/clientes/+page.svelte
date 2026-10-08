<script lang="ts">
	// Negocios con portal propio: alta, cambios (nombre, color, logo, clave) y baja.
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { slugify } from '$lib/brand';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBytes } from '$lib/format';
	import type { AdminClient } from '$lib/types';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Las acciones regresan formas distintas (éxito/fallo); aquí se leen de forma uniforme.
	type FormResult = { form?: string; id?: string; ok?: string; error?: string } | null | undefined;
	const result = $derived(form as FormResult);

	// ---- alta ----
	let creating = $state(false);
	let showCreate = $state(false);
	let name = $state('');
	let slug = $state('');
	let slugTouched = $state(false);
	let color = $state('#ff2d75');
	$effect(() => {
		if (!slugTouched) slug = slugify(name);
	});
	$effect(() => {
		if (data.clients.length === 0) showCreate = true;
	});

	// ---- edición / baja ----
	let editing = $state<string | null>(null);
	let saving = $state(false);
	let toDelete = $state<AdminClient | null>(null);
	let deleting = $state(false);
	let deleteForm = $state<HTMLFormElement | null>(null);

	const portalUrl = (s: string) => `${page.url.origin}/c/${s}`;
	const plural = (n: number) => `${n} ${n === 1 ? 'envío' : 'envíos'}`;
</script>

<svelte:head>
	<title>Clientes · Transfiere</title>
</svelte:head>

<div class="page wide">
	<header class="head">
		<div>
			<h1>Tus <span class="text-grad">clientes</span></h1>
			<p class="muted">
				Cada negocio tiene su portal con su logo, su color y su clave. Lo que manden sale con su marca.
			</p>
		</div>
		{#if !showCreate}
			<button class="btn btn-primary" type="button" onclick={() => (showCreate = true)}>
				<Icon name="plus" size={16} /> Nuevo negocio
			</button>
		{/if}
	</header>

	{#if result?.ok && result.form !== 'editar'}
		<p class="okmsg" role="status"><Icon name="check" size={16} stroke={3} /> {result.ok}</p>
	{/if}

	{#if showCreate}
		<section class="card create">
			<h2>Nuevo negocio</h2>
			<form
				method="POST"
				action="?/crear"
				enctype="multipart/form-data"
				use:enhance={() => {
					creating = true;
					return async ({ result, update }) => {
						await update({ reset: result.type === 'success' });
						creating = false;
						if (result.type === 'success') {
							name = '';
							slug = '';
							slugTouched = false;
							color = '#ff2d75';
							showCreate = false;
						}
					};
				}}
			>
				<div class="grid">
					<label>
						<span class="label">Nombre</span>
						<input class="input" name="name" bind:value={name} placeholder="Estudio Pixel" required />
					</label>
					<label>
						<span class="label">Dirección del portal</span>
						<div class="slug">
							<span class="slug-prefix">/c/</span>
							<input
								class="input"
								name="slug"
								bind:value={slug}
								oninput={() => (slugTouched = true)}
								placeholder="estudio-pixel"
								pattern="[a-z0-9]([a-z0-9\-]*[a-z0-9])?"
								maxlength="40"
								required
							/>
						</div>
					</label>
					<label>
						<span class="label">Clave para su portal</span>
						<input class="input" name="password" type="text" minlength="6" autocomplete="off" required />
					</label>
					<label>
						<span class="label">Color de marca</span>
						<div class="color-row">
							<input class="color" type="color" name="color" bind:value={color} />
							<span class="swatch" style="background: linear-gradient(135deg, {color}, color-mix(in srgb, {color} 72%, #000))"></span>
							<code>{color}</code>
						</div>
					</label>
					<label class="full">
						<span class="label">Logo (PNG, JPG o WebP · máx. 2 MB · opcional)</span>
						<input class="input file" type="file" name="logo" accept="image/png,image/jpeg,image/webp" />
					</label>
				</div>
				{#if result?.form === 'crear' && result.error}
					<p class="error" role="alert">{result.error}</p>
				{/if}
				<div class="actions">
					{#if data.clients.length > 0}
						<button class="btn btn-ghost" type="button" onclick={() => (showCreate = false)}>Cancelar</button>
					{/if}
					<button class="btn btn-primary" type="submit" disabled={creating}>
						{creating ? 'Creando…' : 'Crear portal'}
					</button>
				</div>
			</form>
		</section>
	{/if}

	{#if data.clients.length}
		<ul class="list">
			{#each data.clients as c (c.id)}
				<li class="card ccard">
					<div class="c-top">
						<div class="c-brand">
							{#if c.logoUrl}
								<img class="c-logo" src={c.logoUrl} alt="" />
							{:else}
								<span
									class="c-initial"
									style="background: linear-gradient(135deg, {c.color}, color-mix(in srgb, {c.color} 72%, #000))"
								>
									{c.name.charAt(0).toUpperCase()}
								</span>
							{/if}
							<div class="c-info">
								<p class="c-name">{c.name}</p>
								<a class="c-link" href="/c/{c.slug}" target="_blank" rel="noopener">/c/{c.slug}</a>
								<p class="muted c-stats">{plural(c.transferCount)} · {formatBytes(c.totalSize)}</p>
							</div>
						</div>
						<div class="c-actions">
							<CopyButton text={portalUrl(c.slug)} label="Copiar portal" class="btn btn-ghost btn-sm" />
							<button
								class="btn btn-ghost btn-sm"
								type="button"
								onclick={() => (editing = editing === c.id ? null : c.id)}
							>
								<Icon name="edit" size={16} /> Editar
							</button>
							<button class="btn btn-ghost btn-sm del" type="button" onclick={() => (toDelete = c)}>
								<Icon name="trash" size={16} /> Borrar
							</button>
						</div>
					</div>

					{#if result?.form === 'editar' && result.id === c.id && result.ok && editing !== c.id}
						<p class="okmsg small" role="status"><Icon name="check" size={14} stroke={3} /> {result.ok}</p>
					{/if}

					{#if editing === c.id}
						<form
							class="edit"
							method="POST"
							action="?/editar"
							enctype="multipart/form-data"
							use:enhance={() => {
								saving = true;
								return async ({ result, update }) => {
									await update({ reset: false });
									saving = false;
									if (result.type === 'success') editing = null;
								};
							}}
						>
							<input type="hidden" name="id" value={c.id} />
							<div class="grid">
								<label>
									<span class="label">Nombre</span>
									<input class="input" name="name" value={c.name} required />
								</label>
								<label>
									<span class="label">Color de marca</span>
									<div class="color-row">
										<input class="color" type="color" name="color" value={c.color} />
									</div>
								</label>
								<label>
									<span class="label">Clave nueva (vacío = no cambia)</span>
									<input class="input" name="password" type="text" minlength="6" autocomplete="off" />
								</label>
								<label>
									<span class="label">Logo nuevo (opcional)</span>
									<input class="input file" type="file" name="logo" accept="image/png,image/jpeg,image/webp" />
								</label>
								{#if c.logoUrl}
									<label class="check full">
										<input type="checkbox" name="removeLogo" /> Quitar el logo actual
									</label>
								{/if}
							</div>
							{#if result?.form === 'editar' && result.id === c.id && result.error}
								<p class="error" role="alert">{result.error}</p>
							{/if}
							<div class="actions">
								<button class="btn btn-ghost btn-sm" type="button" onclick={() => (editing = null)}>
									Cancelar
								</button>
								<button class="btn btn-primary btn-sm" type="submit" disabled={saving}>
									{saving ? 'Guardando…' : 'Guardar cambios'}
								</button>
							</div>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<form
	bind:this={deleteForm}
	method="POST"
	action="?/borrar"
	hidden
	use:enhance={() => {
		deleting = true;
		return async ({ update }) => {
			await update();
			deleting = false;
			toDelete = null;
		};
	}}
>
	<input type="hidden" name="id" value={toDelete?.id ?? ''} />
</form>

<ConfirmModal
	open={toDelete !== null}
	title="¿Borrar {toDelete?.name ?? 'este negocio'}?"
	message="Se borran su portal, su logo y TODAS sus transferencias (los links dejan de funcionar). No hay vuelta atrás."
	busy={deleting}
	onconfirm={() => deleteForm?.requestSubmit()}
	oncancel={() => (toDelete = null)}
/>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.8rem 0 1.2rem;
	}
	.head p {
		max-width: 520px;
	}
	.okmsg {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.7rem 0.9rem;
		margin-bottom: 1rem;
		border-radius: 12px;
		background: rgba(22, 163, 74, 0.1);
		color: #15803d;
		font-weight: 600;
		font-size: 0.92rem;
	}
	.okmsg.small {
		margin: 0.8rem 0 0;
		padding: 0.5rem 0.7rem;
		font-size: 0.85rem;
	}

	.create {
		padding: 1.3rem 1.3rem 1.1rem;
		margin-bottom: 1.2rem;
	}
	.create h2 {
		margin-bottom: 1rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
	}
	.grid .full {
		grid-column: 1 / -1;
	}
	@media (max-width: 600px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
	.slug {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.slug-prefix {
		font-weight: 700;
		color: var(--ink-muted);
	}
	.color-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		height: 46px;
	}
	.color {
		width: 52px;
		height: 40px;
		padding: 0;
		border: 1px solid var(--line-strong);
		border-radius: 10px;
		background: #fff;
		cursor: pointer;
	}
	.swatch {
		width: 90px;
		height: 28px;
		border-radius: 999px;
	}
	.file {
		padding: 0.55rem 0.7rem;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.ccard {
		padding: 1rem 1.2rem;
	}
	.c-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.c-brand {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		min-width: 0;
	}
	.c-logo {
		width: 56px;
		height: 56px;
		object-fit: contain;
		border-radius: 12px;
		background: #fff;
		border: 1px solid var(--line);
	}
	.c-initial {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		display: grid;
		place-items: center;
		color: #fff;
		font-weight: 800;
		font-size: 1.4rem;
	}
	.c-info {
		min-width: 0;
	}
	.c-name {
		font-weight: 800;
		font-size: 1.05rem;
		color: var(--ink);
	}
	.c-link {
		font-size: 0.88rem;
		font-weight: 600;
		color: #5b21b6;
		text-decoration: none;
	}
	.c-link:hover {
		text-decoration: underline;
	}
	.c-stats {
		font-size: 0.82rem;
	}
	.c-actions {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
	}
	.del:hover {
		color: #be123c;
		border-color: rgba(190, 18, 60, 0.35);
		background: rgba(255, 59, 92, 0.07);
	}
	.edit {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line);
	}
</style>
