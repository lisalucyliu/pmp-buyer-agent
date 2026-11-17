import { defineConfig } from '@playwright/test';

// Free tests. No UI test can call Claude:
//   1. Playwright starts its own dev server with PMP_FAKE_AGENT=1, so /api/agent is the fake agent
//      (dev/fakeAgentRoute.js). See vite.config.js.
//   2. reuseExistingServer is false, so Playwright never uses a dev server you started (npm run dev on
//      5173 uses real Claude). If port 5174 is already in use, the tests stop with an error.
//   3. ANTHROPIC_API_KEY is set to an empty string for that server, so even the real route would fail.
//   4. tests/e2e/free.spec.js checks that /api/agent answers with the fake agent.
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
    env: { PMP_FAKE_AGENT: '1', ANTHROPIC_API_KEY: '' },
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
