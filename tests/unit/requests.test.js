// api/requests.js and api/keep-awake.js with a fake Supabase client (no network, prompt 2j section 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ROWS_PER_VISITOR, handleRequests } from '../../api/requests.js';
import { handleKeepAwake } from '../../api/keep-awake.js';
import { BUYERS, EXPERIENCES, PRODUCTS, STATUS, experienceFor, statusFor } from '../../shared/catalog.js';
import { CHECK } from '../../shared/requestChecks.js';

// A fake of the small part of the supabase-js query builder that the server uses. It keeps rows in an
// array and applies the same partial unique index as supabase/schema.sql.
function fakeSupabase(initialRows = []) {
  const rows = initialRows.map((row) => ({ ...row }));
  let nextId = 1;
  const newUuid = () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`;
  const pick = (row, columns) => {
    if (!columns || columns === '*') return { ...row };
    return Object.fromEntries(columns.split(',').map((c) => c.trim()).map((c) => [c, row[c]]));
  };

  class Query {
    constructor() {
      this.filters = [];
      this.op = 'select';
    }
    select(columns, options = {}) {
      if (this.op === 'select') this.selectOptions = options;
      this.columns = columns;
      return this;
    }
    insert(row) {
      this.op = 'insert';
      this.payload = row;
      return this;
    }
    update(patch) {
      this.op = 'update';
      this.payload = patch;
      return this;
    }
    eq(column, value) {
      this.filters.push([column, value]);
      return this;
    }
    order(column, { ascending = true } = {}) {
      this.sort = { column, ascending };
      return this;
    }
    limit(n) {
      this.max = n;
      return this;
    }
    single() {
      this.one = true;
      return this;
    }
    matches(row) {
      return this.filters.every(([column, value]) => row[column] === value);
    }
    run() {
      if (this.op === 'insert') {
        const row = { request_id: newUuid(), created_at: new Date().toISOString(), ...this.payload };
        const clash = row.status === 'Pending' && rows.some((r) => r.status === 'Pending' &&
          r.visitor_id === row.visitor_id && r.account_id === row.account_id && r.product_id === row.product_id);
        if (clash) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
        rows.push(row);
        const data = pick(row, this.columns);
        return { data: this.one ? data : [data], error: null };
      }
      if (this.op === 'update') {
        const hit = rows.filter((row) => this.matches(row));
        hit.forEach((row) => Object.assign(row, this.payload));
        return { data: hit.map((row) => pick(row, this.columns)), error: null };
      }
      let hit = rows.filter((row) => this.matches(row));
      if (this.selectOptions?.head) return { data: null, count: hit.length, error: null };
      if (this.sort) {
        const { column, ascending } = this.sort;
        hit = [...hit].sort((a, b) => (ascending ? 1 : -1) * String(a[column]).localeCompare(String(b[column])));
      }
      if (this.max != null) hit = hit.slice(0, this.max);
      return { data: hit.map((row) => pick(row, this.columns)), error: null };
    }
    then(resolve, reject) {
      return Promise.resolve().then(() => this.run()).then(resolve, reject);
    }
  }

  return { rows, from: () => new Query() };
}

const VISITOR = '11111111-1111-4111-8111-111111111111';
const OTHER_VISITOR = '22222222-2222-4222-8222-222222222222';
const riley = BUYERS.find((buyer) => buyer.id === 'riley');
const sam = BUYERS.find((buyer) => buyer.id === 'sam');
const rileyExperience = experienceFor(riley, EXPERIENCES);
const productWith = (status) => PRODUCTS.find((product) => statusFor(product, rileyExperience.id) === status);
const N_PRODUCT = productWith(STATUS.NOT_APPROVED);
const A_PRODUCT = productWith(STATUS.APPROVED);

const record = (overrides = {}) => ({
  account_id: riley.account_id,
  product_id: N_PRODUCT.product_id,
  experience: rileyExperience.id,
  note: 'For the platform team',
  po_number: '',
  date: '2026-11-18T10:00:00.000Z',
  status: 'Pending',
  ...overrides,
});
const storedRow = (overrides = {}) => ({
  request_id: '33333333-3333-4333-8333-333333333333',
  visitor_id: VISITOR,
  ...record(),
  ...overrides,
});

const URL_BASE = 'http://localhost/api/requests';
const post = (body) => new Request(URL_BASE, { method: 'POST', body: JSON.stringify(body) });
const patch = (body) => new Request(URL_BASE, { method: 'PATCH', body: JSON.stringify(body) });
const get = (params) => new Request(`${URL_BASE}?${new URLSearchParams(params)}`, { method: 'GET' });
const answer = async (response) => ({ status: response.status, body: await response.json() });

// Keeps the expected "[requests] refused" log lines out of the test output.
async function quietly(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    return { result: await fn(), logged };
  } finally {
    console.error = original;
  }
}

test('storage off: with no SUPABASE_URL or SUPABASE_SECRET_KEY, every method says storage is off', async () => {
  for (const env of [{}, { SUPABASE_URL: 'x' }, { SUPABASE_SECRET_KEY: 'x' }]) {
    for (const request of [get({ visitor: VISITOR, account: riley.account_id }), post({ visitor: VISITOR, record: record() }), patch({ visitor: VISITOR, requestId: VISITOR })]) {
      const { status, body } = await answer(await handleRequests(request, { env }));
      assert.equal(status, 200);
      assert.deepEqual(body, { storage: 'off' });
    }
  }
});

test('GET returns only this visitor\'s rows for this account, newest first', async () => {
  const db = fakeSupabase([
    storedRow({ request_id: 'a', date: '2026-11-01T00:00:00.000Z' }),
    storedRow({ request_id: 'b', date: '2026-11-17T00:00:00.000Z' }),
    storedRow({ request_id: 'c', visitor_id: OTHER_VISITOR }),
    storedRow({ request_id: 'd', account_id: sam.account_id }),
  ]);
  const { status, body } = await answer(await handleRequests(get({ visitor: VISITOR, account: riley.account_id }), { client: db }));
  assert.equal(status, 200);
  assert.equal(body.storage, 'on');
  assert.deepEqual(body.rows.map((row) => row.request_id), ['b', 'a']);
  assert.ok(body.rows.every((row) => !('visitor_id' in row)));
});

test('GET refuses a visitor ID that is not a UUID, and an account that is not a test buyer', async () => {
  const db = fakeSupabase();
  const { result: bad } = await quietly(async () => [
    await handleRequests(get({ visitor: 'not-a-uuid', account: riley.account_id }), { client: db }),
    await handleRequests(get({ visitor: VISITOR, account: '999999999999' }), { client: db }),
  ]);
  assert.deepEqual(bad.map((r) => r.status), [400, 400]);
});

test('POST saves a good record as Pending, with the visitor ID', async () => {
  const db = fakeSupabase();
  const { status, body } = await answer(await handleRequests(post({ visitor: VISITOR, record: record() }), { client: db }));
  assert.equal(status, 200);
  assert.equal(body.outcome, 'submitted');
  assert.equal(body.row.status, 'Pending');
  assert.equal(body.row.product_id, N_PRODUCT.product_id);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].visitor_id, VISITOR);
});

test('POST checks: visitor UUID, test buyer, requests on, product exists, experience matches', async () => {
  const db = fakeSupabase();
  const samExperience = experienceFor(sam, EXPERIENCES);
  const cases = [
    ['visitor is not a UUID', { visitor: 'abc', record: record() }],
    ['account is not a test buyer', { visitor: VISITOR, record: record({ account_id: '999999999999' }) }],
    ['requests are off (Sam)', { visitor: VISITOR, record: record({ account_id: sam.account_id, experience: samExperience.id }) }],
    ['product does not exist', { visitor: VISITOR, record: record({ product_id: 'prod-nothere' }) }],
    ['experience does not match the buyer', { visitor: VISITOR, record: record({ experience: samExperience.id }) }],
  ];
  assert.equal(samExperience.requests_enabled, false);
  for (const [name, body] of cases) {
    const { result: response, logged } = await quietly(() => handleRequests(post(body), { client: db }));
    assert.equal(response.status, 400, name);
    assert.deepEqual(await response.json(), { error: 'bad_request' }, name);
    assert.equal(logged.length, 1, name);
  }
  assert.equal(db.rows.length, 0);
});

test('POST runs checkRequest with this visitor\'s rows: approved product and duplicate are not sent', async () => {
  const db = fakeSupabase([storedRow()]);
  const duplicate = await answer(await handleRequests(post({ visitor: VISITOR, record: record() }), { client: db }));
  assert.deepEqual(duplicate.body, { storage: 'on', outcome: 'not_sent', reason: CHECK.DUPLICATE });
  const approved = await answer(await handleRequests(post({ visitor: VISITOR, record: record({ product_id: A_PRODUCT.product_id }) }), { client: db }));
  assert.equal(approved.body.reason, CHECK.APPROVED);
  // Another visitor's Pending row for the same product does not block this visitor.
  const other = await answer(await handleRequests(post({ visitor: OTHER_VISITOR, record: record() }), { client: db }));
  assert.equal(other.body.outcome, 'submitted');
  assert.equal(db.rows.length, 2);
});

test('POST: a duplicate blocked by the database unique index gives the same duplicate result', async () => {
  const db = fakeSupabase([storedRow()]);
  // The read misses the row (for example 2 tabs at the same time), so the insert hits the unique index.
  const real = db.from;
  let reads = 0;
  db.from = () => {
    const query = real();
    const run = query.run.bind(query);
    query.run = () => (query.op === 'select' && !query.selectOptions?.head && reads++ === 0 ? { data: [], error: null } : run());
    return query;
  };
  const { body } = await answer(await handleRequests(post({ visitor: VISITOR, record: record() }), { client: db }));
  assert.deepEqual(body, { storage: 'on', outcome: 'not_sent', reason: CHECK.DUPLICATE });
});

test('POST: a record with an empty note is refused and not saved (note required, Lisa, Nov 21)', async () => {
  const db = fakeSupabase();
  for (const note of ['', '   ', undefined]) {
    const { result: response, logged } = await quietly(() => handleRequests(post({ visitor: VISITOR, record: record({ note }) }), { client: db }));
    assert.equal(response.status, 400, JSON.stringify(note));
    assert.deepEqual(await response.json(), { error: 'bad_request' });
    assert.deepEqual(logged, ['[requests] refused: note is empty']);
  }
  assert.equal(db.rows.length, 0);
});

test('POST: a note with no PO number is saved (the PO number stays optional)', async () => {
  const db = fakeSupabase();
  const { body } = await answer(await handleRequests(post({ visitor: VISITOR, record: record({ po_number: '' }) }), { client: db }));
  assert.equal(body.outcome, 'submitted');
  assert.equal(db.rows[0].po_number, '');
});

test(`POST: at most ${MAX_ROWS_PER_VISITOR} rows for each visitor; more is refused`, async () => {
  const rows = Array.from({ length: MAX_ROWS_PER_VISITOR }, (_, i) =>
    storedRow({ request_id: `r${i}`, account_id: i % 2 ? sam.account_id : riley.account_id, product_id: `prod-${i}`, status: 'Canceled' }));
  const db = fakeSupabase(rows);
  const { result: response } = await quietly(() => handleRequests(post({ visitor: VISITOR, record: record() }), { client: db }));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: 'limit' });
  assert.equal(db.rows.length, MAX_ROWS_PER_VISITOR);
  // One row fewer: the save goes through.
  const db24 = fakeSupabase(rows.slice(1));
  const ok = await answer(await handleRequests(post({ visitor: VISITOR, record: record() }), { client: db24 }));
  assert.equal(ok.body.outcome, 'submitted');
});

test('PATCH cancels a Pending row of this visitor', async () => {
  const db = fakeSupabase([storedRow()]);
  const { status, body } = await answer(await handleRequests(patch({ visitor: VISITOR, requestId: storedRow().request_id }), { client: db }));
  assert.equal(status, 200);
  assert.equal(body.row.status, 'Canceled');
  assert.equal(db.rows[0].status, 'Canceled');
});

test('PATCH: cancel of another visitor\'s row is refused, and so is a row that is not Pending', async () => {
  const db = fakeSupabase([storedRow(), storedRow({ request_id: '44444444-4444-4444-8444-444444444444', status: 'Declined' })]);
  const { result } = await quietly(async () => [
    await handleRequests(patch({ visitor: OTHER_VISITOR, requestId: storedRow().request_id }), { client: db }),
    await handleRequests(patch({ visitor: VISITOR, requestId: '44444444-4444-4444-8444-444444444444' }), { client: db }),
    await handleRequests(patch({ visitor: VISITOR, requestId: 'req-sample-1' }), { client: db }),
  ]);
  assert.deepEqual(result.map((r) => r.status), [404, 404, 400]);
  assert.equal(db.rows[0].status, 'Pending');
  assert.equal(db.rows[1].status, 'Declined');
});

test('a database error gives a short reason only: no error text in the response or the log', async () => {
  const db = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'secret detail https://db.example' } }) }) }) }) }) };
  const { result: response, logged } = await quietly(() => handleRequests(get({ visitor: VISITOR, account: riley.account_id }), { client: db }));
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.equal(text, JSON.stringify({ error: 'storage_error' }));
  assert.deepEqual(logged, ['[requests] read failed: database error']);
});

test('keep-awake: needs the CRON_SECRET header, then reads 1 row', async () => {
  const env = { CRON_SECRET: 'test-secret', SUPABASE_URL: 'x', SUPABASE_SECRET_KEY: 'y' };
  const db = fakeSupabase([storedRow(), storedRow({ request_id: 'b' })]);
  let limit = null;
  const realFrom = db.from;
  db.from = () => {
    const query = realFrom();
    const realLimit = query.limit.bind(query);
    query.limit = (n) => {
      limit = n;
      return realLimit(n);
    };
    return query;
  };
  const call = (headers) => handleKeepAwake(new Request('http://localhost/api/keep-awake', { headers }), { env, client: db });
  assert.equal((await call({})).status, 401);
  assert.equal((await call({ authorization: 'Bearer wrong' })).status, 401);
  const ok = await call({ authorization: 'Bearer test-secret' });
  assert.equal(ok.status, 200);
  assert.equal(limit, 1);
  // No CRON_SECRET set: every call is refused.
  const noSecret = await handleKeepAwake(new Request('http://localhost/api/keep-awake', { headers: { authorization: 'Bearer ' } }), { env: {}, client: db });
  assert.equal(noSecret.status, 401);
});
