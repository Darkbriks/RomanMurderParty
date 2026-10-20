import { defineConfig, devices } from '@playwright/test';

// The site is built with the GitHub Pages base path (BASE_PATH, as CI sets it from the repository
// name), so every test also checks that nothing escapes it. Run `npm run data` (in web/) first.
const base = process.env.BASE_PATH ?? '/RomanMurderParty';
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:4173${base}/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview',
    // `vite preview` reads the SvelteKit config too, so it needs the same base path.
    env: { BASE_PATH: base },
    url: `http://localhost:4173${base}/`,
    // Never reuse a running server: it could be serving an older build.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
