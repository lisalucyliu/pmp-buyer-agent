// The Supabase connection for the server functions (api/requests.js, api/keep-awake.js).
// Only server code imports this file. The browser never gets the Supabase URL or a key (decision 2 of prompt 2j).
import { createClient } from '@supabase/supabase-js';

// Local development: load the variables from .env.local, the same way api/agent.js does. Variables that are
// already set win, and a missing file is fine. Never printed.
if (process.env.VERCEL_ENV !== 'production') {
  try {
    process.loadEnvFile(new URL('../.env.local', import.meta.url));
  } catch {}
}

export const TABLE = 'product_request';

// Storage is on only when both variables are set (decision 7 of prompt 2j). Local runs without the keys,
// Vercel Preview and all tests have storage off, and the app keeps requests in the browser session only.
export function storageOn(env = process.env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

// Created on first use. SUPABASE_SECRET_KEY is a key that starts with sb_secret_ (not the legacy service_role key).
let realClient = null;
export function supabaseClient(env = process.env) {
  realClient ??= createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return realClient;
}

// What the server functions use: the injected client (tests), or the real one when storage is on, or null.
export function storageClient({ client = null, env = process.env } = {}) {
  if (client) return client;
  return storageOn(env) ? supabaseClient(env) : null;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
