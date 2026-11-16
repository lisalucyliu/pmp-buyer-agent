import { expect, test } from '@playwright/test';
import { drawer, openFromTrigger, url } from './helpers.js';

// Free tests. Row 1 (E1) and the pages. No Claude calls.

const sideNav = (page) => page.getByRole('navigation').filter({ hasText: 'My Private Marketplace' });

test.describe('E1: frame 1 buttons for Riley and Sam', () => {
  test('Riley: Request product (normal, gen-ai icon) then Explore (the only primary). Request status enabled', async ({ page }) => {
    await page.goto(url('/'));
    await expect(page.getByRole('heading', { name: 'My Private Marketplace', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome to Initech Engineering Marketplace' })).toBeVisible();
    await expect(page.getByText('Product request enabled')).toBeVisible();
    const request = page.getByRole('button', { name: 'Request product' });
    const explore = page.getByRole('link', { name: 'Explore your Private Marketplace' });
    await expect(request).toBeVisible();
    await expect(explore).toBeVisible();
    const [rx, ex] = [await request.boundingBox(), await explore.boundingBox()];
    expect(rx.x).toBeLessThan(ex.x); // left to right
    await expect(sideNav(page).getByRole('link', { name: 'Product requests' })).toBeVisible();
  });

  test('Sam: Request product hidden, request status disabled, Product requests hidden in the nav, trigger still opens the drawer', async ({ page }) => {
    await page.goto(url('/', { buyer: 'sam' }));
    await expect(page.getByRole('heading', { name: 'Welcome to Initech Finance Marketplace' })).toBeVisible();
    await expect(page.getByText('Product request disabled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request product' })).toHaveCount(0);
    await expect(sideNav(page).getByRole('link', { name: 'Product requests' })).toHaveCount(0);
    await openFromTrigger(page);
    await expect(drawer(page)).toContainText('I can check if a product is approved for purchase or find approved products that do the same job.');
    await expect(drawer(page)).not.toContainText('help you request');
  });

  test('Explore opens Discover with the Approved products filter on. The nav link opens it with no filter', async ({ page }) => {
    await page.goto(url('/'));
    await page.getByRole('link', { name: 'Explore your Private Marketplace' }).click();
    await expect(page).toHaveURL(/\/discover\?approved=true/);
    await expect(page.getByRole('switch', { name: 'Approved products' })).toBeChecked();
    await expect(page.getByRole('heading', { name: /Discover products/ })).toContainText('(10)');
    await sideNav(page).getByRole('link', { name: 'Discover products' }).click();
    await expect(page.getByRole('switch', { name: 'Approved products' })).not.toBeChecked();
    await expect(page.getByRole('heading', { name: /Discover products/ })).toContainText('(33)');
  });
});

test.describe('E1: frame 3, all 5 cases', () => {
  const alertText = (page) => page.locator('[class*="awsui_alert"]').first();

  test('N, requests on, no open request (Riley, Meshwire): Request approval shows, View purchase options disabled', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await expect(page.getByRole('heading', { name: 'Meshwire', level: 1 })).toBeVisible();
    await expect(page.getByText("This product isn't approved for purchase in your Private Marketplace. You can request approval from your administrator.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'View purchase options' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Request approval' })).toBeEnabled();
    await expect(page.getByText('Sold by: Meshwire')).toHaveCount(0); // vendor equals the product name
    await expect(page.getByText('Approved for purchase', { exact: true })).toHaveCount(0);
    expect(alertText).toBeTruthy();
  });

  test('Pending (Riley, QuarryDB Cloud sample row): Request approval hidden, Alert links to Product requests', async ({ page }) => {
    await page.goto(url('/products/quarrydb-cloud-pay-as-you-go'));
    await expect(page.getByText('You requested approval for this product. View its status in')).toBeVisible();
    await expect(page.getByTestId('case-alert').getByRole('link', { name: 'Product requests' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request approval' })).toHaveCount(0);
    await expect(page.getByText('Sold by: QuarryDB')).toBeVisible();
  });

  test('A (Riley, Tunnelport): no Alert, View purchase options enabled, purple badge, no agent button', async ({ page }) => {
    await page.goto(url('/products/tunnelport-access-server-byol'));
    await expect(page.getByRole('button', { name: 'View purchase options' })).toBeEnabled();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Approved for purchase');
    await expect(page.getByText("isn't approved for purchase")).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Request approval' })).toHaveCount(0);
  });

  test('Sam (requests off): Request approval hidden, requests-off Alert', async ({ page }) => {
    await page.goto(url('/products/meshwire', { buyer: 'sam' }));
    await expect(page.getByText("This product isn't approved for purchase in your Private Marketplace. Product requests are turned off.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request approval' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View purchase options' })).toBeDisabled();
  });

  test('D (Riley, Lumora Image Large): Request approval hidden, blocked Alert', async ({ page }) => {
    await page.goto(url('/products/lumora-image-large'));
    await expect(page.getByText("This product isn't approved for purchase in your Private Marketplace. This product can't be requested.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request approval' })).toHaveCount(0);
  });

  test('Sam with a D product sees the requests-off Alert (decision 1)', async ({ page }) => {
    await page.goto(url('/products/breachkit-linux', { buyer: 'sam' }));
    await expect(page.getByText('Product requests are turned off.')).toBeVisible();
  });
});

test.describe('Frame 2: Product requests', () => {
  test('columns, sample rows, newest first, Cancel request only on Pending with a unique label', async ({ page }) => {
    await page.goto(url('/product-requests'));
    const headers = await page.getByRole('columnheader').allTextContents();
    expect(headers.map((h) => h.trim())).toEqual(['Requested product', 'Status', 'Date requested (UTC-05:00)', 'Actions']);
    const rows = page.getByRole('row');
    await expect(rows.nth(1)).toContainText('QuarryDB Cloud (pay-as-you-go)');
    await expect(rows.nth(1)).toContainText('Pending');
    await expect(rows.nth(1)).toContainText('Nov 10, 2026, 10:42');
    await expect(rows.nth(2)).toContainText('Bastion NGFW VM');
    await expect(rows.nth(2)).toContainText('Declined');
    await expect(rows.nth(2)).toContainText('Oct 27, 2026, 15:08');
    await expect(rows.nth(2).getByRole('cell').last()).toHaveText('-');
    await expect(page.getByRole('button', { name: 'Cancel request for QuarryDB Cloud (pay-as-you-go)' })).toBeVisible();
    // Discover products (normal), then Request product (primary).
    const discover = await page.getByRole('link', { name: 'Discover products' }).last().boundingBox();
    const request = await page.getByRole('button', { name: 'Request product' }).boundingBox();
    expect(discover.x).toBeLessThan(request.x);
  });

  test('Cancel request changes the row to Canceled', async ({ page }) => {
    await page.goto(url('/product-requests'));
    await page.getByRole('button', { name: 'Cancel request for QuarryDB Cloud (pay-as-you-go)' }).click();
    await expect(page.getByRole('row').nth(1)).toContainText('Canceled');
    await expect(page.getByRole('button', { name: /Cancel request for/ })).toHaveCount(0);
  });
});

test.describe('Q1: buyer switch', () => {
  test('the buyer menu switches Riley to Sam and clears the conversation', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await page.getByRole('textbox', { name: 'Ask a question' }).fill('Do we have a VPN I can use?');
    await page.keyboard.press('Enter');
    await expect(drawer(page)).toContainText('I found 3 products');
    await page.getByRole('button', { name: /Buyer: Riley/ }).click();
    await page.getByRole('menuitemcheckbox', { name: /Sam/ }).or(page.getByRole('menuitem', { name: /Sam/ })).first().click();
    await expect(page.getByText('Product request disabled')).toBeVisible();
    await expect(drawer(page)).not.toContainText('I found 3 products');
    await expect(page).toHaveURL(/buyer=sam/);
  });
});

test.describe('Backup request form', () => {
  test('pre-filled product, required reason, saves a Pending row', async ({ page }) => {
    await page.goto(url('/request-form?product=prod-wrensiiq'));
    await expect(page.getByRole('textbox', { name: 'Product' })).toHaveValue('Auditlane');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('Reason for request is required.')).toBeVisible();
    await page.getByRole('textbox', { name: 'Reason for request' }).fill('Audit prep for Q1');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page).toHaveURL(/\/product-requests/);
    await expect(page.getByRole('row').nth(1)).toContainText('Auditlane');
    await expect(page.getByRole('row').nth(1)).toContainText('Pending');
  });

  test('a duplicate is not saved', async ({ page }) => {
    await page.goto(url('/request-form?product=prod-gpgexaru'));
    await page.getByRole('textbox', { name: 'Reason for request' }).fill('Again');
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByText('You already sent a request for this product.').first()).toBeVisible();
  });
});
