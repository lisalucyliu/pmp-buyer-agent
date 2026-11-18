// DEV ONLY (step 1). Serves /api/agent from the fake agent in tests/fakeAgent.js. It never calls Claude.
// `apply: 'serve'` keeps it out of `vite build`, so it never ships. Step 2 replaces it with the real
// server function.
//
// Page URL switches (read from the Referer header, so the app code has no test code in it):
//   ?fakeDelay=0         no delay (tests). Default: about 1.2 seconds for each tool step, so you can see
//                        the loading states (frame 8). Cloudscape shows no loading state under 1 second.
//   ?fakeError=connection | E1a | E1b | E2   every agent call fails that way (frame 21, E4)
//
// /api/requests here always answers "storage off", so `npm run dev:fake` and the tests never reach
// Supabase, even when the local env file has the Supabase variables (decision 7 of prompt 2j). UI tests
// that need saved rows replace /api/requests in the browser (page.route in tests/e2e/storage.spec.js).
import { fakeAgentEvents, fakeErrorEvents } from '../tests/fakeAgent.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function pageParams(req) {
  try {
    return new URL(req.headers.referer ?? '').searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export default function fakeAgentRoute() {
  return {
    name: 'pmp-fake-agent-dev-route',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/requests', (req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ storage: 'off' }));
      });
      server.middlewares.use('/api/agent', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        const params = pageParams(req);
        const delay = params.has('fakeDelay') ? Number(params.get('fakeDelay')) : 1200;
        const options = { stepDelayMs: delay, tokenDelayMs: delay ? 40 : 0 };
        const fakeError = params.get('fakeError');
        const body = await readJson(req);

        if (fakeError === 'connection') {
          req.socket.destroy(); // The browser's fetch fails with no reply.
          return undefined;
        }

        const events = fakeErrorEvents(fakeError, body, options) ?? fakeAgentEvents(body, options);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        for (const { event, delayMs } of events) {
          if (delayMs) await sleep(delayMs);
          if (res.destroyed) return undefined;
          res.write(`${JSON.stringify(event)}\n`);
        }
        res.end();
        return undefined;
      });
    },
  };
}
