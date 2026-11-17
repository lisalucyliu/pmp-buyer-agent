import { expect, test } from '@playwright/test';
import { FAKE_NO_SCRIPT } from '../fakeAgent.js';

// No UI test can call Claude. This checks that the dev server Playwright started serves the fake agent:
// a message with no script gets the fake agent's own line, which the real server never sends.
test('the Playwright dev server answers /api/agent with the fake agent, not Claude', async ({ request }) => {
  const response = await request.post('/api/agent', {
    data: { buyerId: 'riley', messages: [{ role: 'user', content: 'free test check 7f3a' }], openRequests: [], flags: {} },
  });
  expect(response.ok()).toBe(true);
  const events = (await response.text()).trim().split('\n').map((line) => JSON.parse(line));
  const text = events.filter((e) => e.type === 'text').map((e) => e.delta).join('');
  expect(text.trim()).toBe(FAKE_NO_SCRIPT);
  expect(events.at(-1)).toEqual({ type: 'done' });
});
