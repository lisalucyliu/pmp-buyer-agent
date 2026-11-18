import { expect, test } from '@playwright/test';
import { url } from './helpers.js';

// Free tests. Product requests saved for each browser (prompt 2j). The dev server's /api/requests says
// "storage off", so these tests replace it in the browser with a fake that keeps rows in memory.
// No test reaches Supabase or Claude.

const VISITOR = '11111111-1111-4111-8111-111111111111';
const AUDITLANE_ROW = {
  request_id: '33333333-3333-4333-8333-333333333333',
  visitor_id: VISITOR,
  account_id: '111122223333',
  product_id: 'prod-wrensiiq',
  experience: 'Engineering',
  note: 'Audit prep for Q1',
  po_number: '',
  date: '2026-11-18T15:00:00.000Z',
  status: 'Pending',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const strip = ({ visitor_id, ...row }) => row; // eslint-disable-line no-unused-vars

// A fake /api/requests with the same answers as api/requests.js when storage is on.
// `db` can be shared by 2 pages, to act as one Supabase table.
async function fakeRequestsApi(page, { db = [], readDelayMs = 0, readFails = false, cancelFails = false, notSent = null } = {}) {
  const calls = [];
  await page.route(/\/api\/requests(\?|$)/, async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === 'GET') {
      const params = new URL(request.url()).searchParams;
      calls.push({ method, visitor: params.get('visitor') });
      if (readDelayMs) await sleep(readDelayMs);
      if (readFails) return route.fulfill({ status: 500, json: { error: 'storage_error' } });
      const rows = db
        .filter((row) => row.visitor_id === params.get('visitor') && row.account_id === params.get('account'))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(strip);
      return route.fulfill({ json: { storage: 'on', rows } });
    }
    const body = request.postDataJSON();
    calls.push({ method, visitor: body.visitor });
    if (method === 'POST') {
      if (notSent) return route.fulfill({ json: { storage: 'on', outcome: 'not_sent', reason: notSent } });
      const row = { request_id: crypto.randomUUID(), visitor_id: body.visitor, ...body.record, status: 'Pending' };
      db.push(row);
      return route.fulfill({ json: { storage: 'on', outcome: 'submitted', row: strip(row) } });
    }
    if (cancelFails) return route.abort('connectionreset');
    const row = db.find((r) => r.request_id === body.requestId && r.visitor_id === body.visitor && r.status === 'Pending');
    if (!row) return route.fulfill({ status: 404, json: { error: 'not_found' } });
    row.status = 'Canceled';
    return route.fulfill({ json: { storage: 'on', row: strip(row) } });
  });
  return { db, calls };
}

async function useVisitor(page, id = VISITOR) {
  await page.addInitScript((value) => window.localStorage.setItem('pmp-visitor-id', value), id);
}

test.describe('Prompt 2j: Product requests saved for each browser', () => {
  test('a saved request still shows after a reload; another visitor does not see it', async ({ page, browser }) => {
    const api = await fakeRequestsApi(page);
    await page.goto(url('/request-form?product=prod-wrensiiq'));
    await page.getByRole('textbox', { name: 'Reason for request' }).fill('Audit prep for Q1');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page).toHaveURL(/\/product-requests/);
    await expect(page.getByRole('row').nth(1)).toContainText('Auditlane');

    await page.reload();
    await expect(page.getByRole('row').nth(1)).toContainText('Auditlane');
    await expect(page.getByRole('row').nth(1)).toContainText('Pending');
    await expect(page.getByRole('row')).toHaveCount(4); // Header, Auditlane, 2 sample rows

    // One visitor ID, kept in localStorage, sent with every read and write.
    const visitor = await page.evaluate(() => window.localStorage.getItem('pmp-visitor-id'));
    expect(visitor).toMatch(/^[0-9a-f-]{36}$/);
    expect(api.calls.length).toBeGreaterThanOrEqual(3);
    expect(api.calls.every((call) => call.visitor === visitor)).toBe(true);

    // A second browser (a new visitor ID) with the same table sees only the sample rows.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await fakeRequestsApi(otherPage, { db: api.db });
    await otherPage.goto(url('/product-requests'));
    await expect(otherPage.getByRole('button', { name: 'Cancel request for QuarryDB Cloud (pay-as-you-go)' })).toBeVisible();
    await expect(otherPage.getByRole('row')).toHaveCount(3);
    await expect(otherPage.getByText('Auditlane')).toHaveCount(0);
    await other.close();
  });

  test('the Table shows its loading state while the read runs', async ({ page }) => {
    await useVisitor(page);
    await fakeRequestsApi(page, { db: [{ ...AUDITLANE_ROW }], readDelayMs: 1500 });
    await page.goto(url('/product-requests'));
    await expect(page.getByText('Loading requests')).toBeVisible();
    await expect(page.getByRole('row').nth(1)).toContainText('Auditlane');
    await expect(page.getByText('Loading requests')).toHaveCount(0);
  });

  test('read fails: only the 2 sample rows show, with no error message', async ({ page }) => {
    await useVisitor(page);
    await fakeRequestsApi(page, { db: [{ ...AUDITLANE_ROW }], readFails: true });
    await page.goto(url('/product-requests'));
    await expect(page.getByRole('button', { name: 'Cancel request for QuarryDB Cloud (pay-as-you-go)' })).toBeVisible();
    await expect(page.getByText('Loading requests')).toHaveCount(0);
    await expect(page.getByRole('row')).toHaveCount(3);
    await expect(page.getByRole('row').nth(1)).toContainText('QuarryDB Cloud (pay-as-you-go)');
    await expect(page.getByRole('row').nth(2)).toContainText('Bastion NGFW VM');
    await expect(page.getByText('Auditlane')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText(/error/i)).toHaveCount(0);
  });

  test('cancel fails: the row stays Pending and a dismissible error Flashbar shows', async ({ page }) => {
    await useVisitor(page);
    const api = await fakeRequestsApi(page, { db: [{ ...AUDITLANE_ROW }], cancelFails: true });
    await page.goto(url('/product-requests'));
    await page.getByRole('button', { name: 'Cancel request for Auditlane' }).click();
    const flash = page.getByText('A connection error stopped the cancellation of your request for Auditlane. The request is still pending. Try again.');
    await expect(flash).toBeVisible();
    await expect(page.getByRole('row').nth(1)).toContainText('Pending');
    await expect(page.getByRole('button', { name: 'Cancel request for Auditlane' })).toBeVisible();
    expect(api.db[0].status).toBe('Pending');
    // The Flashbar is above the Table.
    const flashBox = await flash.boundingBox();
    const tableBox = await page.getByRole('table').boundingBox();
    expect(flashBox.y).toBeLessThan(tableBox.y);
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    await expect(flash).toHaveCount(0);
  });

  test('cancel works: a saved row changes to Canceled in the table and in storage', async ({ page }) => {
    await useVisitor(page);
    const api = await fakeRequestsApi(page, { db: [{ ...AUDITLANE_ROW }] });
    await page.goto(url('/product-requests'));
    await page.getByRole('button', { name: 'Cancel request for Auditlane' }).click();
    await expect(page.getByRole('row').nth(1)).toContainText('Canceled');
    expect(api.db[0].status).toBe('Canceled');
    await page.reload();
    await expect(page.getByRole('row').nth(1)).toContainText('Canceled');
  });

  test('a duplicate that only the server finds gives the same message as the app check on the request form', async ({ page }) => {
    await useVisitor(page);
    await fakeRequestsApi(page, { notSent: 'duplicate' });
    await page.goto(url('/request-form?product=prod-wrensiiq'));
    await page.getByRole('textbox', { name: 'Reason for request' }).fill('Audit prep for Q1');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('You already sent a request for this product. View its status in Product requests.').first()).toBeVisible();
    await expect(page).toHaveURL(/\/request-form/);
  });
});
