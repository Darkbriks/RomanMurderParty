import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'model', root: './model', include: ['test/**/*.test.ts'] } },
      { test: { name: 'converter', root: './converter', include: ['test/**/*.test.ts'] } },
      { test: { name: 'site', root: './site', include: ['src/**/*.test.ts'] } },
    ],
  },
});
