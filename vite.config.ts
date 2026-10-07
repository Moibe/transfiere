import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Mismo puerto que tendrá en el droplet (4500). strictPort: si está ocupado, falla en vez de
	// brincar a otro puerto en silencio.
	server: { port: 4500, strictPort: true },
	preview: { port: 4500, strictPort: true },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node: el droplet corre `node build/index.js` bajo pm2 detrás de nginx.
			adapter: adapter()
		})
	]
});
