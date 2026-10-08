<script lang="ts">
	// Íconos inline de trazo (24x24, estilo lucide), sin dependencias. Todo son <path> para
	// no depender de {@html} dentro de <svg>.
	const ICONS: Record<string, string[]> = {
		'upload-cloud': ['M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2', 'M12 12v9', 'm16 16-4-4-4 4'],
		file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v4a2 2 0 0 0 2 2h4'],
		x: ['M18 6 6 18', 'm6 6 12 12'],
		check: ['M20 6 9 17l-5-5'],
		copy: [
			'M11 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
			'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'
		],
		download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
		trash: [
			'M3 6h18',
			'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
			'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
			'M10 11v6',
			'M14 11v6'
		],
		send: ['m22 2-7 20-4-9-9-4z', 'M22 2 11 13'],
		clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z', 'M12 6v6l4 2'],
		lock: [
			'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
			'M7 11V7a5 5 0 0 1 10 0v4'
		],
		logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
		list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
		alert: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z', 'M12 8v4', 'M12 16h.01'],
		refresh: ['M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5'],
		plus: ['M12 5v14', 'M5 12h14'],
		external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
		'message-circle': ['M7.9 20A9 9 0 1 0 4 16.1L2 22z'],
		'arrow-up': ['M12 19V5', 'm5 12 7-7 7 7'],
		'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
		users: [
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
			'M9 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
			'M22 21v-2a4 4 0 0 0-3-3.9',
			'M16 3.1a4 4 0 0 1 0 7.8'
		],
		edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'],
		image: [
			'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
			'M9 7a2 2 0 1 0 0 4 2 2 0 1 0 0-4z',
			'm21 15-5-5L5 21'
		],
		heart: [
			'M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z'
		]
	};

	type Props = { name: string; size?: number; stroke?: number; class?: string };
	let { name, size = 20, stroke = 2, class: cls = '' }: Props = $props();
	const paths = $derived(ICONS[name] ?? []);
</script>

<svg
	class={cls}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each paths as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	svg {
		flex-shrink: 0;
		display: inline-block;
		vertical-align: middle;
	}
</style>
