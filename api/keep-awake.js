// Keep-awake (decision 3 of prompt 2j). A Vercel cron job calls GET /api/keep-awake once a day (see the
// "crons" entry in vercel.json). It reads 1 row, so the Supabase Free project does not pause.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with each cron call. Any other caller gets 401.
import { TABLE, json, storageClient } from '../server/supabase.js';

export async function handleKeepAwake(request, deps = {}) {
  const env = deps.env ?? process.env;
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return json({ error: 'unauthorized' }, 401);
  }
  const db = storageClient(deps);
  if (!db) return json({ storage: 'off' });
  try {
    const { error } = await db.from(TABLE).select('request_id').limit(1);
    if (error) throw new Error('database error');
  } catch {
    console.error('[keep-awake] read failed: database error');
    return json({ error: 'storage_error' }, 500);
  }
  return json({ storage: 'on', ok: true });
}

export const GET = (request) => handleKeepAwake(request);
