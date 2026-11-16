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
    // The badge sits under the title row, as in the Figma frame "PMP buyer PDP - approved".
    const badge = page.getByText('Approved for purchase', { exact: true });
    await expect(badge).toBeVisible();
    const [title, badgeBox] = [await page.getByRole('heading', { level: 1 }).boundingBox(), await badge.boundingBox()];
    expect(badgeBox.y).toBeGreaterThan(title.y + title.height);
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

// ---- Step 1 fixes (Nov 16): Figma frames ----

test.describe('Left nav from the Figma frames', () => {
  const navLinks = (page) => page.getByRole('navigation').filter({ hasText: 'Procurement insights' });

  test('Riley: items, order, the Private Marketplace expandable link group, and the active page', async ({ page }) => {
    await page.goto(url('/'));
    const nav = navLinks(page);
    await expect(nav.getByRole('link')).toHaveText([
      'AWS Marketplace', 'Discover products', 'Procurement insights', 'Manage subscriptions', 'Private offers', 'Vendor insights',
      'Private Marketplace', 'My Private Marketplace', 'Product requests', 'Settings',
    ]);
    await expect(nav.getByRole('link', { name: 'My Private Marketplace' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Private Marketplace', exact: true })).not.toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: 'Product requests' }).click();
    await expect(page).toHaveURL(/\/product-requests/);
    await expect(nav.getByRole('link', { name: 'Product requests' })).toHaveAttribute('aria-current', 'page');
  });

  test('product page: Discover products is active and the Private Marketplace group is collapsed', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    const nav = navLinks(page);
    await expect(nav.getByRole('link', { name: 'Discover products' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Private Marketplace' }).or(nav.locator('[aria-expanded]')).first()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Sam: Product requests hidden in the group. A nav item outside the prototype opens a page that says so', async ({ page }) => {
    await page.goto(url('/', { buyer: 'sam' }));
    const nav = navLinks(page);
    await expect(nav.getByRole('link', { name: 'My Private Marketplace' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Product requests' })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Private offers' }).click();
    await expect(page.getByRole('heading', { name: 'Private offers', level: 1 })).toBeVisible();
    await expect(page.getByText("This page isn't part of the prototype.")).toBeVisible();
  });
});

test.describe('D4: gen-ai gradient on the entry point buttons', () => {
  const background = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundImage);

  test('normal variant (My Private Marketplace, product page): gradient border, Cloudscape text color', async ({ page }) => {
    await page.goto(url('/'));
    const request = page.getByRole('button', { name: 'Request product' });
    expect(await background(request)).toContain('url("data:image/svg+xml');
    expect(await request.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(0, 108, 224)');
    await page.goto(url('/products/meshwire'));
    expect(await background(page.getByRole('button', { name: 'Request approval' }))).toContain('url("data:image/svg+xml');
  });

  test('primary variant: white text is at least 4.5:1 at every point of the gradient, default, hover and active', async ({ page }) => {
    await page.goto(url('/product-requests'));
    const button = page.locator('[data-gen-ai-button=primary]');
    // Hide the text and icon, then read the background pixels under the text box.
    await button.evaluate((el) => el.querySelectorAll('span, svg').forEach((n) => { n.style.visibility = 'hidden'; }));
    const worst = async () => {
      const png = await button.screenshot();
      return page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, img.width, img.height);
        const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
        let min = 99;
        // Skip the rounded ends (16px each side) and the border rows; sample the middle band.
        for (let y = 6; y < img.height - 6; y += 1) {
          for (let x = 16; x < img.width - 16; x += 1) {
            const i = (y * img.width + x) * 4;
            const l = 0.2126 * ch(data[i]) + 0.7152 * ch(data[i + 1]) + 0.0722 * ch(data[i + 2]);
            min = Math.min(min, 1.05 / (l + 0.05));
          }
        }
        return min;
      }, png.toString('base64'));
    };
    expect(await worst()).toBeGreaterThanOrEqual(4.5);
    await button.hover();
    await page.waitForTimeout(200);
    expect(await worst()).toBeGreaterThanOrEqual(4.5);
    await page.mouse.down();
    await page.waitForTimeout(200);
    expect(await worst()).toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
  });

  test('primary variant (Product requests): gradient fill, white text. Still the only primary button', async ({ page }) => {
    await page.goto(url('/product-requests'));
    const request = page.getByRole('button', { name: 'Request product' });
    expect(await background(request)).toContain('url("data:image/svg+xml');
    expect(await request.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
    await expect(page.locator('[data-gen-ai-button=primary]')).toHaveCount(1);
  });
});

test.describe('Product page sections from the Figma frames', () => {
  test('section tabs, section headings, catalog data, placeholders and no prices', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await expect(page.getByRole('tab')).toHaveText(['Overview', 'Pricing', 'Legal', 'Usage', 'Resources', 'Support', 'Links', 'Videos']);
    // Heading levels (Nov 16): section titles h2, container titles h3.
    // The page's h2 headings after the h1 (the side navigation title "AWS Marketplace" is also an h2).
    const h2 = await page.evaluate(() => [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()));
    expect(h2.slice(h2.indexOf('Overview'))).toEqual(['Overview', 'Pricing', 'Legal', 'Usage information', 'Resources', 'Support']);
    await expect(page.getByRole('heading', { level: 3 })).toContainText(['Highlights', 'Details']);
    await expect(page.getByRole('link', { name: 'Remote network access (VPN)' }).last()).toHaveAttribute('href', /category=Remote/);
    await expect(page.getByText('[Placeholder: highlight 1]')).toBeVisible();
    await expect(page.getByRole('img', { name: '[Logo]' })).toBeVisible();
    // Decision 107: no prices anywhere.
    await expect(page.locator('main, body').first()).not.toContainText('$');
    // Spec frame 3: no other buttons in the action stack, and no Request demo.
    await expect(page.getByRole('button', { name: /Request demo|Try for free|Request private offer/ })).toHaveCount(0);
  });

  test('a section tab scrolls to its section', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.getByRole('tab', { name: 'Support' }).click();
    await expect(page.locator('#support')).toBeInViewport();
    await expect(page.getByRole('tab', { name: 'Support' })).toHaveAttribute('aria-selected', 'true');
  });

  test('the top navigation stays at the top when the page scrolls (App layout: sticky header)', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.evaluate(() => window.scrollTo(0, 1500));
    expect(await page.locator('#top-nav').evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
    await expect(page.getByRole('button', { name: 'Riley' })).toBeInViewport();
  });

  test('D5: the active tab follows the scroll', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    const tab = (name) => page.getByRole('tab', { name, exact: true });
    await expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    // Scroll by hand (not with a tab) so that each section's top reaches the top of the window.
    for (const [id, name] of [['pricing', 'Pricing'], ['legal', 'Legal'], ['usage', 'Usage']]) {
      await page.evaluate((sectionId) => {
        const top = document.getElementById(sectionId).getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - 20);
      }, id);
      await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    // At the bottom of the page, the last section is active.
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
    await expect(tab('Support')).toHaveAttribute('aria-selected', 'true');
  });

  test("D5: a tab whose section can't reach the top stays active after the jump", async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.getByRole('tab', { name: 'Resources' }).click();
    await expect(page.locator('#resources')).toBeInViewport();
    await page.waitForTimeout(1000); // smooth scroll ends
    await expect(page.getByRole('tab', { name: 'Resources' })).toHaveAttribute('aria-selected', 'true');
  });
});

// ---- Step 1 fixes, round 2 (Nov 16) ----

test.describe('Round 2 fixes', () => {
  test('D5: the tab row stays in view under the top navigation when the page scrolls', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.evaluate(() => window.scrollTo(0, 1500));
    const row = page.locator('[data-tab-row]');
    await expect(row).toBeInViewport();
    await expect.poll(async () => {
      const [nav, tabs] = await Promise.all([
        page.locator('#top-nav').evaluate((el) => el.getBoundingClientRect().bottom),
        row.evaluate((el) => el.getBoundingClientRect().top),
      ]);
      return Math.round(tabs - nav);
    }).toBe(0);
  });

  test('D5: after a tab jump, the section title is below the tab row (desktop and phone)', async ({ page }) => {
    for (const size of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(size);
      await page.goto(url('/products/meshwire'));
      await page.getByRole('tab', { name: 'Legal' }).click();
      await expect(page.getByRole('tab', { name: 'Legal' })).toHaveAttribute('aria-selected', 'true');
      await page.waitForTimeout(1000);
      const rowBottom = await page.locator('[data-tab-row]').evaluate((el) => el.getBoundingClientRect().bottom);
      const titleTop = await page.locator('#legal h2').evaluate((el) => el.getBoundingClientRect().top);
      expect(titleTop).toBeGreaterThan(rowBottom);
    }
  });

  test('Product requests: with no matches, the header count is still the total', async ({ page }) => {
    await page.goto(url('/product-requests'));
    await page.getByRole('searchbox', { name: 'Find requests' }).fill('zzz');
    await expect(page.getByText('No matches')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('(2)');
    await expect(page.getByText('0 matches').first()).toBeVisible();
  });

  test('Product requests: "Cancel request" is visible on tablet and phone widths', async ({ page }) => {
    for (const size of [{ width: 768, height: 1024 }, { width: 375, height: 812 }]) {
      await page.setViewportSize(size);
      await page.goto(url('/product-requests'));
      await expect(page.getByRole('button', { name: 'Cancel request for QuarryDB Cloud (pay-as-you-go)' })).toBeInViewport({ ratio: 1 });
    }
  });

  test('side nav: closed by the drawer at 1024px, open again when the drawer closes', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto(url('/'));
    const navLink = page.getByRole('navigation').getByRole('link', { name: 'Procurement insights' });
    await expect(navLink).toBeVisible();
    await openFromTrigger(page);
    await expect(navLink).toBeHidden();
    await page.getByRole('button', { name: 'Close product request assistant' }).click();
    await expect(navLink).toBeVisible();
  });

  test('side nav: a buyer who closed the nav keeps it closed after the drawer closes', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto(url('/'));
    await page.getByRole('button', { name: 'Close side navigation' }).click();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Procurement insights' })).toBeHidden();
    await openFromTrigger(page);
    await page.getByRole('button', { name: 'Close product request assistant' }).click();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Procurement insights' })).toBeHidden();
  });

  test('heading levels: 1 h1 per page and no skipped levels', async ({ page }) => {
    for (const path of ['/', '/product-requests', '/discover', '/request-form', '/products/meshwire', '/products/tunnelport-access-server-byol', '/private-offers']) {
      await page.goto(url(path));
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      const all = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])));
      // From the h1 on, each heading goes down at most 1 level.
      const fromH1 = all.slice(all.indexOf(1));
      for (let i = 1; i < fromH1.length; i += 1) expect(fromH1[i] - fromH1[i - 1], `${path}: ${fromH1.join(',')}`).toBeLessThanOrEqual(1);
    }
  });
});
