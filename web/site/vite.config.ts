import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit 3 takes its configuration here (no svelte.config.js).
export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
      paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}`, relative: false },
      prerender: { entries: ['*', '/characters/'] },
    }),
  ],
});
