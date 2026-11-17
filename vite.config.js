import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import apiDevRoute from './dev/apiDevRoute.js';
import fakeAgentRoute from './dev/fakeAgentRoute.js';

// Which /api/agent the dev server uses (both run in `vite` dev mode only, `apply: 'serve'`, so neither
// is in `vite build`):
//   npm run dev        dev/apiDevRoute.js: the real server function, real Claude (paid requests)
//   npm run dev:fake   dev/fakeAgentRoute.js: the fake agent, never calls Claude (Playwright uses this)
export const useFakeAgent = process.env.PMP_FAKE_AGENT === '1';

export default defineConfig({
  plugins: [react(), useFakeAgent ? fakeAgentRoute() : apiDevRoute()],
});
