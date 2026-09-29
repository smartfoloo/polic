import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// 404.html is the fallback page for unknown URLs (Caddy: handle_errors → /404.html)
			adapter: adapter({ fallback: '404.html' }),
			// Type-check the pipeline scripts along with the app
			typescript: {
				config: (config) => {
					config.include.push('../scripts/**/*.js');
				}
			}
		})
	]
});
