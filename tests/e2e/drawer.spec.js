import { expect, test } from '@playwright/test';
import { ask, countAgentCalls, drawer, openFromTrigger, prompt, promptBox, recordLiveRegions, routeAgent, settled, url } from './helpers.js';

// Free tests for the drawer, with the fake agent (dev/fakeAgentRoute.js) or a fixed stream. No Claude calls.

const card = (page) => page.getByTestId('confirm-card').last();
const NOTE_MISSING = 'A note is required. Add a note for your administrator about why you need this product.';
// Product List items only (the Steps in a step line are a list too).
const items = (page) => drawer(page).getByRole('list', { name: 'Products' }).getByRole('listitem');

async function meshwireCard(page, note = 'Need this for the Q1 network migration. PO 4500012345') {
  await page.goto(url('/products/meshwire'));
  await page.getByRole('button', { name: 'Request approval' }).click();
  await expect(drawer(page)).toContainText("You're looking at Meshwire.");
  await ask(page, note);
  await expect(card(page)).toBeVisible();
}

test.describe('Empty states and shell', () => {
  test('frame 2b from Request product: request copy, no prompts', async ({ page }) => {
    await page.goto(url('/'));
    await page.getByRole('button', { name: 'Request product' }).click();
    await expect(drawer(page)).toContainText('Request a product');
    await expect(drawer(page)).toContainText("Tell me which product you need. I'll check if it's already approved");
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Product request assistant', level: 2 })).toBeVisible();
  });

  test('frame 4 from the trigger: 2 editable prompts fill the prompt input and do not send', async ({ page }) => {
    const calls = countAgentCalls(page);
    await page.goto(url('/'));
    await openFromTrigger(page);
    await expect(drawer(page)).toContainText('Ask about products in your Private Marketplace');
    await prompt(page, 'Edit prompt: Is <product name> approved for purchase?').click();
    await expect(promptBox(page)).toHaveValue('Is <product name> approved for purchase?');
    expect(calls.count).toBe(0);
  });

  test('footer: placeholder, disclaimer with an external link, no upload or stop button', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await expect(promptBox(page)).toHaveAttribute('placeholder', 'Ask a question');
    const policy = page.getByRole('link', { name: /AWS Responsible AI Policy/ });
    await expect(policy).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('button', { name: /stop|regenerate|upload/i })).toHaveCount(0);
  });

  test('the drawer keeps its conversation across pages', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await expect(drawer(page)).toContainText('I found 3 products');
    await page.getByRole('navigation').getByRole('link', { name: 'Product requests' }).click();
    await expect(page.getByRole('heading', { name: /Product requests/, level: 1 })).toBeVisible();
    await expect(drawer(page)).toContainText('I found 3 products');
  });
});

test.describe('Frames 6 and 7', () => {
  test('frame 6: step line collapsed, text, List in ranked order, badge on approved only, no request prompt (2 can be requested)', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    const step = page.getByRole('button', { name: 'Searched your Private Marketplace for "VPN"' });
    await expect(step).toHaveAttribute('aria-expanded', 'false');
    await step.click();
    await expect(drawer(page)).toContainText('Searched products. 3 matched.');
    await expect(items(page)).toHaveCount(3);
    await expect(items(page).nth(0)).toContainText('Meshwire');
    await expect(items(page).nth(0)).toContainText('Secure networking that replaces legacy VPNs');
    await expect(items(page).nth(0)).not.toContainText('Meshwire ·');
    await expect(items(page).nth(1)).toContainText('Tunnelport · Self-hosted business VPN on EC2');
    await expect(items(page).nth(1)).toContainText('Approved for purchase');
    await expect(items(page).nth(0)).not.toContainText('Approved for purchase');
    await expect(items(page).nth(2)).not.toContainText('Approved for purchase');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });

  test('frame 7: more than 5 matches: question, no List, 4 choices in the dialog; a choice shows all products in its categories', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'I need a security tool');
    await expect(drawer(page)).toContainText('9 products match "security". What do you need it for?');
    await expect(items(page)).toHaveCount(0);
    const dialog = page.getByTestId('clarify-dialog');
    await expect(dialog.getByRole('menuitem')).toHaveText([
      'Threat detection and response', 'Firewall and VPN', 'Compliance automation', 'Server and workload protection',
    ]);
    await dialog.getByRole('menuitem', { name: 'Firewall and VPN' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(items(page)).toHaveCount(4);
    await expect(items(page).locator('a')).toHaveText([
      // Q4 (option B): approved for Riley first, then catalog order.
      'Tunnelport Access Server (BYOL)', 'Meshwire', 'Bastion NGFW VM', 'Shalecrest UTM 9',
    ]);
  });

  test('frame 7: the dialog can be dismissed, and typing an own answer closes it', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'I need a security tool');
    await page.getByRole('button', { name: 'Dismiss choices' }).click();
    await expect(page.getByTestId('clarify-dialog')).toHaveCount(0);
    await ask(page, 'I need a security tool');
    await expect(page.getByTestId('clarify-dialog')).toBeVisible();
    await ask(page, 'Do we have a VPN I can use?');
    await expect(page.getByTestId('clarify-dialog')).toHaveCount(0);
  });
});

test.describe('Frames 5, 9, 10 (alternatives)', () => {
  test('frame 5: no Claude call, 1 non-editable prompt; frame 9: alternatives and Request Meshwire', async ({ page }) => {
    const calls = countAgentCalls(page);
    await page.goto(url('/products/meshwire'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await expect(drawer(page)).toContainText(
      "You're looking at Meshwire. It isn't approved for purchase in your Private Marketplace. I can send a request for approval to your administrator. Add a note for your administrator about why you need this product. A PO number is optional.",
    );
    expect(calls.count).toBe(0);
    await expect(page.getByRole('menuitem')).toHaveText(['Show approved alternatives']);
    await prompt(page, 'Show approved alternatives').click();
    await expect(drawer(page)).toContainText('1 approved product in your Private Marketplace is also used for remote network access (VPN).');
    await page.getByRole('button', { name: 'Checked approved products like Meshwire' }).click();
    await expect(drawer(page)).toContainText('Checked approved products in Remote network access (VPN). 1 found.');
    await expect(items(page)).toHaveCount(1);
    await expect(page.getByRole('menuitem')).toHaveText(['Request Meshwire']);
  });

  test('frame 10 (Riley, Auditlane): 0 found and Request Auditlane', async ({ page }) => {
    await page.goto(url('/products/auditlane'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await prompt(page, 'Show approved alternatives').click();
    await expect(drawer(page)).toContainText('No approved products in your Private Marketplace do the same job as Auditlane.');
    await expect(page.getByRole('menuitem')).toHaveText(['Request Auditlane']);
  });
});

test.describe('Row 3 and 4: the card', () => {
  test('E2: card heading gets focus, no dialog role, prompt input enabled, Note and PO rows, no Vendor row for Meshwire', async ({ page }) => {
    await meshwireCard(page);
    await expect(drawer(page)).toContainText("Here's the request I'll send to your administrator.");
    await expect(card(page).getByRole('heading', { name: 'Submit request for Meshwire?' })).toBeVisible();
    await expect(page.getByTestId('card-heading').last()).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(promptBox(page)).toBeEnabled();
    await expect(card(page)).toContainText('Need this for the Q1 network migration.');
    await expect(card(page)).toContainText('4500012345');
    await expect(card(page)).not.toContainText('Vendor');
  });

  test('E2: Vendor row when the vendor differs, PO number row left out when empty (Watchtail Enterprise, note only)', async ({ page }) => {
    await page.goto(url('/products/watchtail-enterprise'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await ask(page, 'For the security team');
    await expect(card(page)).toContainText('Vendor');
    await expect(card(page)).toContainText('Watchtail');
    await expect(card(page)).toContainText('For the security team.');
    await expect(card(page)).not.toContainText('PO number');
  });

  test('note asked once: after frame 5, "Request Meshwire" with no note gets the noteMissing line, not a second ask', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await prompt(page, 'Show approved alternatives').click();
    await prompt(page, 'Request Meshwire').click();
    await expect(drawer(page)).toContainText(NOTE_MISSING);
    await expect(card(page)).toHaveCount(0);
    await expect(drawer(page).getByText(/^Add a note for your administrator about why you need this product\. A PO number is optional\.$/)).toHaveCount(0);
    await ask(page, 'Need this for the Q1 network migration.');
    await expect(card(page)).toBeVisible();
  });

  test('note asked before the first card when it was not asked yet (typed request), with no support prompt', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Request Auditlane');
    await expect(drawer(page)).toContainText('Add a note for your administrator about why you need this product. A PO number is optional.');
    await expect(card(page)).toHaveCount(0);
    await expect(page.getByRole('menuitem')).toHaveCount(0);
    await ask(page, 'We need it for the SOC 2 audit');
    await expect(card(page)).toBeVisible();
  });

  test('note required (Lisa, Nov 21): no note, then only a PO number, each get the noteMissing line and no card; then a note gives the card', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await expect(drawer(page)).toContainText("You're looking at Meshwire.");
    await ask(page, 'No note');
    await expect(drawer(page).getByText(NOTE_MISSING)).toHaveCount(1);
    await expect(card(page)).toHaveCount(0);
    await ask(page, 'PO 4500012345');
    await expect(drawer(page).getByText(NOTE_MISSING)).toHaveCount(2);
    await expect(card(page)).toHaveCount(0);
    await ask(page, 'Need this for the Q1 network migration.');
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText('Need this for the Q1 network migration.');
  });

  test('E3: Submit with no change: Submitted, success text, new row, Meshwire page changes, no /api/agent call after the click', async ({ page }) => {
    await meshwireCard(page);
    const calls = countAgentCalls(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(card(page)).toContainText('Submitted');
    await expect(card(page).getByRole('button')).toHaveCount(0);
    await expect(drawer(page)).toContainText('I sent your request for Meshwire to your administrator. You can see its status in Product requests.');
    expect(calls.count).toBe(0);
    // Frame 15: the page behind updates at once.
    await expect(page.getByText('You requested approval for this product.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request approval' })).toHaveCount(0);
    await drawer(page).getByRole('link', { name: 'Product requests' }).click();
    await expect(page.getByRole('row').nth(1)).toContainText('Meshwire');
    await expect(page.getByRole('row').nth(1)).toContainText('Pending');
    await expect(drawer(page)).toContainText('I sent your request for Meshwire');
  });

  test('E4: a fast save shows "Sent your request" with no "Sending your request"', async ({ page }) => {
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(drawer(page)).toContainText('Sent your request');
    await expect(drawer(page)).not.toContainText('Sending your request');
  });

  test('E4: a test-only slow save shows "Sending your request" first', async ({ page }) => {
    await page.addInitScript(() => { window.__pmpSaveDelayMs = 2000; });
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(card(page)).toContainText('Submitted');
    await expect(drawer(page)).toContainText('Sending your request', { timeout: 1900 });
    await expect(drawer(page)).toContainText('Sent your request');
  });

  test('frame 12: save fails: error Alert, Try again saves the same record with no new card', async ({ page }) => {
    await page.addInitScript(() => { window.__pmpSaveFails = true; });
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(drawer(page)).toContainText("Your request for Meshwire wasn't sent because of a connection error.");
    await expect(drawer(page).getByRole('link', { name: 'You can also use the request form.' })).toBeVisible();
    await page.evaluate(() => { window.__pmpSaveFails = false; });
    await drawer(page).getByRole('button', { name: 'Try again' }).click();
    await expect(drawer(page)).toContainText('I sent your request for Meshwire');
    await expect(page.getByTestId('confirm-card')).toHaveCount(1);
  });

  test('E5: focus returns to the card heading, the new bubble is in the LiveRegion', async ({ page }) => {
    await recordLiveRegions(page);
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByTestId('card-heading').last()).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.__live.join(' | '))).toContain('I sent your request for Meshwire');
  });

  test('E5: no auto-scroll while the buyer reads older messages', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    for (const text of ['Do we have a VPN I can use?', 'Is Watchtail Pro approved?', 'How much does Watchtail Pro cost?']) {
      await ask(page, text);
      await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
      await page.waitForTimeout(150);
    }
    const scroller = await page.evaluateHandle(() => {
      let el = document.querySelector('[aria-label="Chat"]');
      while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      return el;
    });
    await scroller.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(100);
    await ask(page, 'Do we have Zentrova?');
    await expect(drawer(page)).toContainText('I didn\'t find a product named "Zentrova"');
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThan(50);
  });

  test('E6: reload clears the session request (known limit); sample rows stay', async ({ page }) => {
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(drawer(page)).toContainText('I sent your request for Meshwire');
    await page.goto(url('/product-requests'));
    await expect(page.getByRole('row')).toHaveCount(3); // header + 2 sample rows
    await expect(page.getByRole('table')).not.toContainText('Meshwire');
  });

  test('Cancel: Not sent, "Got it. I didn\'t send the request." and Show approved alternatives', async ({ page }) => {
    await meshwireCard(page);
    await card(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(card(page)).toContainText('Not sent');
    await expect(drawer(page)).toContainText("Got it. I didn't send the request.");
    await expect(page.getByRole('menuitem')).toHaveText(['Show approved alternatives']);
    await expect(page.getByTestId('card-heading').last()).toBeFocused();
  });

  test('Cancel after alternatives were shown: no Show approved alternatives prompt', async ({ page }) => {
    await page.goto(url('/products/meshwire'));
    await page.getByRole('button', { name: 'Request approval' }).click();
    await prompt(page, 'Show approved alternatives').click();
    await prompt(page, 'Request Meshwire').click();
    await expect(drawer(page)).toContainText(NOTE_MISSING);
    await ask(page, 'Need this for the Q1 network migration.');
    await card(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(drawer(page)).toContainText("Got it. I didn't send the request.");
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });

  test('frame 16 in the browser: a request sent from the backup form while the card is open: Not sent and the frame 13 line', async ({ page }) => {
    await meshwireCard(page);
    // Go to the form inside the app (no reload), so the session store and the open card stay.
    await page.evaluate(() => {
      window.history.pushState(null, '', '/request-form?product=prod-rqccxbpo&fakeDelay=0');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.getByRole('textbox', { name: 'Reason for request' }).fill('From the form');
    await page.locator('form').getByRole('button', { name: 'Submit request' }).click();
    await expect(page).toHaveURL(/product-requests/);
    await card(page).getByRole('button', { name: 'Submit request' }).click();
    await expect(card(page)).toContainText('Not sent');
    await expect(drawer(page)).toContainText('You already sent a request for Meshwire. View its status in Product requests.');
  });

  test('frame 13: duplicate in chat: the fixed line with a link, no card, no prompts', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Request QuarryDB Cloud (pay-as-you-go)');
    await expect(drawer(page)).toContainText('You already sent a request for QuarryDB Cloud (pay-as-you-go). View its status in Product requests.');
    await expect(drawer(page).getByRole('link', { name: 'Product requests' })).toBeVisible();
    await expect(page.getByTestId('confirm-card')).toHaveCount(0);
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });
});

test.describe('Row 5: hand-off', () => {
  test('E7: frame 18: contact bubble with Email copy button and Slack plain text; no prompts after a hand-off (E8)', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'I need Lumora Image Large.');
    await expect(drawer(page)).toContainText("This product can't be requested. To ask about it, contact your administrator.");
    await expect(drawer(page)).toContainText('eng-software@initech.example');
    await expect(page.getByRole('button', { name: 'Copy email address' })).toBeVisible();
    await expect(drawer(page)).toContainText('#eng-software-requests');
    await expect(drawer(page).getByRole('link', { name: '#eng-software-requests' })).toHaveCount(0);
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });

  test('E7: frame 17 (Sam): requests-off hand-off, "speak with", no contact bubble, no prompts', async ({ page }) => {
    await page.goto(url('/', { buyer: 'sam' }));
    await openFromTrigger(page);
    await ask(page, 'Can I get Meshwire?');
    await expect(drawer(page)).toContainText('Meshwire isn\'t approved for purchase in your Private Marketplace. No approved products in your Private Marketplace do the same job.');
    await expect(drawer(page)).toContainText('Product requests are turned off in your Private Marketplace, so I can\'t send a request for Meshwire. To ask about it, speak with your administrator.');
    await expect(drawer(page)).not.toContainText('@');
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });

  test('frame 19 (H3): one sentence and the hand-off; Riley gets the contact bubble', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Can I get a refund for Watchtail Pro?');
    await expect(drawer(page)).toContainText("I can't help with refunds. Contact your administrator.");
    await expect(page.getByRole('button', { name: 'Copy email address' })).toBeVisible();
  });

  test('E8: frame 20: no hand-off, 1 editable prompt', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Do we have Zentrova?');
    await expect(drawer(page)).toContainText('I didn\'t find a product named "Zentrova". Check the spelling, or tell me what you need it for, and I can look for an approved product that does the same job.');
    await expect(drawer(page)).not.toContainText('administrator');
    await expect(page.getByRole('menuitem')).toHaveCount(1);
    await prompt(page, 'Edit prompt: Find an approved product for <what you need>').click();
    await expect(promptBox(page)).toHaveValue('Find an approved product for <what you need>');
  });
});

test.describe('Row 7: links and plain text', () => {
  test('E15: each List item href is the console route for that product, same tab, no external icon', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    const links = items(page).getByRole('link');
    await expect(links).toHaveCount(3);
    const hrefs = await links.evaluateAll((all) => all.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['/products/meshwire', '/products/tunnelport-access-server-byol', '/products/shalecrest-utm-9']);
    for (const target of await links.evaluateAll((all) => all.map((a) => a.getAttribute('target')))) expect(target).toBeNull();
    await links.nth(1).click();
    await expect(page.getByRole('heading', { name: /Tunnelport Access Server \(BYOL\)/, level: 1 })).toBeVisible();
    await expect(drawer(page)).toContainText('I found 3 products'); // same tab, drawer still open
  });

  test('frame 23 (P1): approved product, 1 List item, no prompts', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Can you just buy Tunnelport Access Server for me?');
    await expect(drawer(page)).toContainText("I can't buy products for you. Tunnelport Access Server (BYOL) is approved for purchase in your Private Marketplace. To buy it, choose View purchase options on its product page.");
    await expect(items(page)).toHaveCount(1);
    await expect(page.getByRole('menuitem')).toHaveCount(0);
  });

  test('frame 24 (P2): alternatives list only (no Meshwire item) and Request Meshwire', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Just buy Meshwire for me.');
    await expect(drawer(page)).toContainText("I can't buy products for you. Meshwire isn't approved for purchase in your Private Marketplace.");
    await expect(items(page)).toHaveCount(1);
    await expect(items(page)).toContainText('Tunnelport Access Server (BYOL)');
    await expect(page.getByRole('menuitem')).toHaveText(['Request Meshwire']);
  });

  test('frames 25 to 27: price, approved, comparison', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'How much does Watchtail Pro cost?');
    await expect(drawer(page)).toContainText("I can't see prices. You can find pricing for Watchtail Pro on its product page.");
    await ask(page, "What's the difference between Watchtail Pro and Watchtail Enterprise?");
    await expect(drawer(page)).toContainText('Watchtail Pro is approved for purchase in your Private Marketplace, and Watchtail Enterprise isn\'t.');
    await expect(page.getByRole('menuitem')).toHaveText(['Request Watchtail Enterprise']);
  });

  test('E16: markdown from the agent shows as literal plain text', async ({ page }) => {
    await routeAgent(page, [
      { type: 'text', delta: '**Meshwire** is\n# not approved\n| a | b |\n|---|---|' },
      { type: 'done' },
    ]);
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'anything');
    const text = drawer(page).getByTestId('assistant-text').last();
    await expect(text).toContainText('**Meshwire** is');
    await expect(text).toContainText('# not approved');
    await expect(text).toContainText('| a | b |');
    await expect(drawer(page).locator('strong, h1, table')).toHaveCount(0);
  });

  test('Q3 in the UI: a short name in the text gets no List item', async ({ page }) => {
    // The fake agent's products event is replaced with code's rule run on this text.
    await routeAgent(page, [
      { type: 'step', id: 's1', status: 'success', text: 'Searched products. 3 matched.', header: 'Searched your Private Marketplace for "VPN"' },
      { type: 'text', delta: 'Tunnelport is approved. Meshwire isn\'t.' },
      { type: 'products', ids: ['prod-rqccxbpo'] },
      { type: 'done' },
    ]);
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'vpn');
    await expect(items(page)).toHaveCount(1);
  });
});

test.describe('Row 6: errors (frames 8c, 21, 22)', () => {
  const alertIn = (page) => drawer(page).getByRole('alert').or(drawer(page).locator('[class*="awsui_alert"]')).first();

  test('E9: connection error: Alert, Try again, request form link, prompt input enabled', async ({ page }) => {
    await page.goto(url('/', { fakeError: 'connection' }));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await expect(drawer(page)).toContainText("The response couldn't be generated because of a connection error.");
    await expect(drawer(page).getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(drawer(page).getByRole('link', { name: 'You can also use the request form.' })).toHaveAttribute('href', '/request-form');
    await expect(promptBox(page)).toBeEnabled();
    expect(alertIn).toBeTruthy();
  });

  test('E10: E1a (busy): busy Alert with Try again; the search step shows its error status', async ({ page }) => {
    await page.goto(url('/', { fakeError: 'E1a' }));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await expect(drawer(page)).toContainText("The product request assistant is busy, so the response couldn't be generated. Try again in a few minutes.");
    await expect(drawer(page)).toContainText("Couldn't search your Private Marketplace");
    await expect(drawer(page).getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('E11: E1b (not available): link only, no Try again', async ({ page }) => {
    await page.goto(url('/', { fakeError: 'E1b' }));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await expect(drawer(page)).toContainText("The product request assistant isn't available right now. You can use the request form to send your request.");
    await expect(drawer(page).getByRole('link', { name: 'request form', exact: true })).toBeVisible();
    await expect(drawer(page).getByRole('button', { name: 'Try again' })).toHaveCount(0);
  });

  test('E12: E2 (stops halfway): partial text and stacked bubbles removed, Alert only', async ({ page }) => {
    await page.goto(url('/', { fakeError: 'E2' }));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await expect(drawer(page)).toContainText('The response stopped before it was complete because of a connection error.');
    await expect(drawer(page)).not.toContainText('I found');
    await expect(items(page)).toHaveCount(0);
  });

  test('E13 (E4): Try again fails again: the same Alert shows again', async ({ page }) => {
    await page.goto(url('/', { fakeError: 'E1a' }));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    const calls = countAgentCalls(page);
    await drawer(page).getByRole('button', { name: 'Try again' }).click();
    await expect.poll(() => calls.count).toBe(1);
    await expect(drawer(page).getByText("The product request assistant is busy")).toHaveCount(1);
  });

  test('Try again works when the next call succeeds: the response replaces the Alert', async ({ page }) => {
    let first = true;
    await page.route('**/api/agent', async (route) => {
      if (first) {
        first = false;
        return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: `${JSON.stringify({ type: 'error', errorType: 'E1a' })}\n` });
      }
      return route.continue();
    });
    await page.goto(url('/'));
    await openFromTrigger(page);
    await ask(page, 'Do we have a VPN I can use?');
    await drawer(page).getByRole('button', { name: 'Try again' }).click();
    await expect(drawer(page)).toContainText('I found 3 products');
    await expect(drawer(page)).not.toContainText('busy');
  });

  test('E14: E3 with the dev-only switch: Alert, Reload page, Error details collapsed with the message, header stays, page works', async ({ page }) => {
    await page.goto(url('/', { devCrash: 'drawer' }));
    await openFromTrigger(page).catch(() => {});
    await expect(page.getByText("The product request assistant couldn't load. Reload the page to try again. You can also use the request form.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
    const details = page.getByRole('button', { name: 'Error details' });
    await expect(details).toHaveAttribute('aria-expanded', 'false');
    await details.click();
    await expect(page.getByText('devCrash=drawer: the drawer threw on purpose')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Product request assistant', level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close product request assistant' })).toBeVisible();
    await page.getByRole('link', { name: 'Explore your Private Marketplace' }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test('E14: E3 with Cloudscape forceError: our fallback, no Error details (forceError does not call onError)', async ({ page }) => {
    await page.goto(url('/'));
    await openFromTrigger(page);
    await page.evaluate(() => document.querySelector('[data-awsui-boundary-id="assistant-drawer"]').__awsui__.forceError());
    await expect(page.getByText("The product request assistant couldn't load.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Error details' })).toHaveCount(0);
  });
});

// Bug (Nov 18): "Request approval" scrolled the product page down about 2300 px. The drawer auto-scroll
// fell back to the page when the conversation was too short to scroll (scrollParent in AssistantDrawer.jsx).
test.describe('Page scroll when the drawer opens', () => {
  test('Meshwire product page: scrollY stays 0 after "Request approval", and the prompt input has focus', async ({ page }) => {
    await page.goto(url('/products/meshwire', { buyer: 'riley' }));
    await expect(page.getByRole('button', { name: 'Request approval' }).first()).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.getByRole('button', { name: 'Request approval' }).first().click();
    await expect(drawer(page)).toContainText("You're looking at Meshwire");
    await expect(promptBox(page)).toBeFocused();
    await page.waitForTimeout(500); // A late scroll would show here.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('long conversation: the confirm card heading gets focus, and the page does not scroll', async ({ page }) => {
    await page.goto(url('/products/meshwire', { buyer: 'riley' }));
    await openFromTrigger(page);
    for (let i = 0; i < 4; i += 1) {
      await ask(page, 'Do we have a VPN I can use?');
      await settled(page);
    }
    await page.getByRole('button', { name: 'Request approval' }).first().click();
    await expect(promptBox(page)).toBeFocused();
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
    await ask(page, 'Need this for the Q1 network migration. PO 4500012345');
    await expect(page.getByTestId('card-heading').last()).toBeFocused();
    await expect(page.getByTestId('card-heading').last()).toBeInViewport();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(600);
  });
});
