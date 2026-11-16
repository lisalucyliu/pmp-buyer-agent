import { expect } from '@playwright/test';

// Every test page uses ?fakeDelay=0, so the fake agent answers at once. No test calls Claude.
export const url = (path = '/', params = {}) => {
  const search = new URLSearchParams({ fakeDelay: '0', ...params });
  return `${path}${path.includes('?') ? '&' : '?'}${search}`;
};

export const drawer = (page) => page.getByRole('region', { name: 'Chat' });
export const promptBox = (page) => page.getByRole('textbox', { name: 'Ask a question' });
export const prompt = (page, name) => page.getByRole('menuitem', { name, exact: true });

export async function openFromTrigger(page) {
  await page.getByRole('button', { name: 'Open product request assistant' }).click();
  await expect(drawer(page)).toBeVisible();
}

export async function ask(page, text) {
  await promptBox(page).fill(text);
  await page.keyboard.press('Enter');
}

// Waits until no response is streaming.
export async function settled(page) {
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Chat"] [class*="loading"]'), null, { timeout: 5000 }).catch(() => {});
}

// Counts calls to /api/agent.
export function countAgentCalls(page) {
  const calls = { count: 0 };
  page.on('request', (request) => {
    if (request.url().endsWith('/api/agent')) calls.count += 1;
  });
  return calls;
}

// Records every text written into an aria-live element.
export async function recordLiveRegions(page) {
  await page.addInitScript(() => {
    window.__live = [];
    const seen = new WeakMap();
    new MutationObserver(() => {
      for (const element of document.querySelectorAll('[aria-live]')) {
        const text = element.textContent.trim();
        if (text && seen.get(element) !== text) window.__live.push(text);
        seen.set(element, text);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
}

// Replaces /api/agent with a fixed NDJSON stream for one test.
export async function routeAgent(page, events, { status = 200, abort = false } = {}) {
  await page.route('**/api/agent', (route) => {
    if (abort) return route.abort('connectionreset');
    return route.fulfill({
      status,
      contentType: 'application/x-ndjson',
      body: events.map((event) => JSON.stringify(event)).join('\n') + (events.length ? '\n' : ''),
    });
  });
}
