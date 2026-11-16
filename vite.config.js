import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fakeAgentRoute from './dev/fakeAgentRoute.js';

export default defineConfig({
  // Step 1: fakeAgentRoute serves /api/agent from tests/fakeAgent.js inside `npm run dev` only.
  // It never calls Claude, and `apply: 'serve'` keeps it out of `vite build`.
  plugins: [react(), fakeAgentRoute()],
});
