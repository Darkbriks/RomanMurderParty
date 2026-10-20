import { defineConfig, devices } from '@playwright/test';

// The site is built with the GitHub Pages base path, so every test also checks that
// nothing escapes /RomanMurderParty/. Run `npm run data` (in web/) first.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173/RomanMurderParty/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'BASE_PATH=/RomanMurderParty npm run build && npm run preview',
    // `vite preview` reads the SvelteKit config too, so it needs the same base path.
    env: { BASE_PATH: '/RomanMurderParty' },
    url: 'http://localhost:4173/RomanMurderParty/',
    // Never reuse a running server: it could be serving an older build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
