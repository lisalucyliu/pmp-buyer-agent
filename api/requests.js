// The server function for product requests (/api/requests). The only code that reads or writes the
// product_request table in Supabase, with the secret key (decision 2 of prompt 2j).
//   GET   ?visitor=<id>&account=<id>   that visitor's rows for that account, newest first
//   POST  { visitor, record }          checks the record, then saves it
//   PATCH { visitor, requestId }       cancels one Pending row of that visitor
// When SUPABASE_URL or SUPABASE_SECRET_KEY is not set, every method answers { storage: 'off' }, and the app
// keeps requests in the browser session only (decision 7).
// No key, URL or database error text goes in a response or a log line. Logs have a short reason only.
import { BUYERS, EXPERIENCES, PRODUCTS, experienceFor, findProduct } from '../shared/catalog.js';
import { REQUEST_STATUS, createProductRequest, hasNote } from '../shared/productRequest.js';
import { CHECK, checkRequest } from '../shared/requestChecks.js';
import { TABLE, json, storageClient } from '../server/supabase.js';

export const MAX_ROWS_PER_VISITOR = 25;
export const NOTE_MAX = 500;
export const PO_NUMBER_MAX = 100;
const COLUMNS = 'request_id, account_id, product_id, experience, note, po_number, date, status';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres code for a unique index violation: the database blocked a second Pending request.
const UNIQUE_VIOLATION = '23505';

const isUuid = (value) => typeof value === 'string' && UUID.test(value);
const buyerForAccount = (accountId) => BUYERS.find((buyer) => buyer.account_id === accountId) ?? null;

const STORAGE_OFF = { storage: 'off' };
const badRequest = (reason) => {
  console.error(`[requests] refused: ${reason}`);
  return json({ error: 'bad_request' }, 400);
};
const storageError = (operation) => {
  console.error(`[requests] ${operation} failed: database error`);
  return json({ error: 'storage_error' }, 500);
};

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function visitorRows(db, visitor, accountId) {
  return db.from(TABLE).select(COLUMNS).eq('visitor_id', visitor).eq('account_id', accountId).order('date', { ascending: false });
}

async function handleGet(request, db) {
  const params = new URL(request.url).searchParams;
  const visitor = params.get('visitor');
  const account = params.get('account');
  if (!isUuid(visitor)) return badRequest('visitor ID is not a UUID');
  if (!buyerForAccount(account)) return badRequest('account is not a test buyer');
  const { data, error } = await visitorRows(db, visitor, account);
  if (error) return storageError('read');
  return json({ storage: 'on', rows: data ?? [] });
}

async function handlePost(request, db) {
  const body = await readJson(request);
  const visitor = body?.visitor;
  const record = body?.record;
  if (!isUuid(visitor)) return badRequest('visitor ID is not a UUID');
  if (!record || typeof record !== 'object') return badRequest('no record');
  const buyer = buyerForAccount(record.account_id);
  if (!buyer) return badRequest('account is not a test buyer');
  const experience = experienceFor(buyer, EXPERIENCES);
  if (!experience.requests_enabled) return badRequest('requests are off for this buyer');
  if (!findProduct(record.product_id, PRODUCTS)) return badRequest('product does not exist');
  if (record.experience !== experience.id) return badRequest('experience does not match the buyer');
  const note = record.note ?? '';
  const poNumber = record.po_number ?? '';
  // The note is required (Lisa, Nov 21), the same check as the browser. A request with no note is never saved.
  if (!hasNote(note)) return badRequest('note is empty');
  if (note.trim().length > NOTE_MAX) return badRequest('note is too long');
  if (typeof poNumber !== 'string' || poNumber.trim().length > PO_NUMBER_MAX) return badRequest('PO number is too long');
  const date = new Date(record.date);
  if (typeof record.date !== 'string' || Number.isNaN(date.getTime())) return badRequest('date is not valid');

  // The same check list as the browser (decision 18), with this visitor's rows from the database.
  const { data: rows, error: readError } = await visitorRows(db, visitor, buyer.account_id);
  if (readError) return storageError('read');
  const check = checkRequest({ productId: record.product_id, buyer, experience, requests: rows ?? [], products: PRODUCTS });
  if (check.result !== CHECK.OK) return json({ storage: 'on', outcome: 'not_sent', reason: check.result });

  // At most 25 rows for each visitor, for all accounts.
  const { count, error: countError } = await db.from(TABLE).select('request_id', { count: 'exact', head: true }).eq('visitor_id', visitor);
  if (countError) return storageError('count');
  if ((count ?? 0) >= MAX_ROWS_PER_VISITOR) {
    console.error('[requests] refused: visitor has the most rows');
    return json({ error: 'limit' }, 429);
  }

  const row = createProductRequest({
    accountId: buyer.account_id,
    productId: record.product_id,
    experienceId: experience.id,
    note,
    poNumber,
    date,
  });
  const { data: saved, error } = await db.from(TABLE).insert({ ...row, visitor_id: visitor }).select(COLUMNS).single();
  if (error?.code === UNIQUE_VIOLATION) return json({ storage: 'on', outcome: 'not_sent', reason: CHECK.DUPLICATE });
  if (error) return storageError('save');
  return json({ storage: 'on', outcome: 'submitted', row: saved });
}

async function handlePatch(request, db) {
  const body = await readJson(request);
  const visitor = body?.visitor;
  const requestId = body?.requestId;
  if (!isUuid(visitor)) return badRequest('visitor ID is not a UUID');
  if (!isUuid(requestId)) return badRequest('request ID is not a UUID');
  // Only a Pending row with this visitor ID. Another visitor's row matches nothing.
  const { data, error } = await db.from(TABLE)
    .update({ status: REQUEST_STATUS.CANCELED })
    .eq('request_id', requestId)
    .eq('visitor_id', visitor)
    .eq('status', REQUEST_STATUS.PENDING)
    .select(COLUMNS);
  if (error) return storageError('cancel');
  if (!data?.length) {
    console.error('[requests] refused: no Pending row for this visitor');
    return json({ error: 'not_found' }, 404);
  }
  return json({ storage: 'on', row: data[0] });
}

const HANDLERS = { GET: handleGet, POST: handlePost, PATCH: handlePatch };

// `deps` is for the unit tests: { client } is a fake Supabase client, { env } replaces process.env.
export async function handleRequests(request, deps = {}) {
  const handler = HANDLERS[request.method];
  if (!handler) return json({ error: 'method_not_allowed' }, 405);
  const db = storageClient(deps);
  if (!db) return json(STORAGE_OFF);
  try {
    return await handler(request, db);
  } catch {
    return storageError(request.method);
  }
}

export const GET = (request) => handleRequests(request);
export const POST = (request) => handleRequests(request);
export const PATCH = (request) => handleRequests(request);
