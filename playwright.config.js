import { defineConfig } from '@playwright/test';

// Free tests. /api/agent is the fake agent (dev/fakeAgentRoute.js), so no test calls Claude.
// Playwright starts `npm run dev` on port 5174 by itself, so your own dev server on 5173 can stay open.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 1440, height: 1000 },
    // Optional: a browser that is already on this Mac (see README, "Tests").
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
