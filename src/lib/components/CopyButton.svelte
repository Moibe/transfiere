<script lang="ts">
	import Icon from './Icon.svelte';

	type Props = { text: string; label?: string; copiedLabel?: string; class?: string };
	let {
		text,
		label = 'Copiar link',
		copiedLabel = '¡Copiado!',
		class: cls = 'btn btn-primary'
	}: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Fallback para contextos sin clipboard API (http sin TLS en una IP, por ejemplo).
	function legacyCopy(value: string) {
		const ta = document.createElement('textarea');
		ta.value = value;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy');
		ta.remove();
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			legacyCopy(text);
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1800);
	}
</script>

<button class={cls} type="button" onclick={copy} aria-live="polite">
	<Icon name={copied ? 'check' : 'copy'} size={16} />
	{copied ? copiedLabel : label}
</button>
