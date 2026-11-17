// Free tests for the paid-run runner (scripts/run_agent.js). A fake Claude client, so 0 paid requests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODEL } from '../../api/agent.js';
import { PRODUCTS } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { cardNotes } from '../../shared/agentNotes.js';
import { costOf, dryRunText, planOf, readConversations, runConversation, summaryMarkdown } from '../../scripts/run_agent.js';
import { fakeClaude, say, useTool } from '../fakeClaude.js';

const byName = (name) => PRODUCTS.find((p) => p.name === name);
const MESHWIRE = byName('Meshwire');

test('dry run: run A expects 10 paid requests and run B 15, with no Claude call', () => {
  const a = readConversations('a');
  const b = readConversations('b');
  assert.equal(a.reduce((sum, c) => sum + planOf(c).expected, 0), 10);
  assert.equal(b.reduce((sum, c) => sum + planOf(c).expected, 0), 15);
  assert.match(dryRunText('a', a), /Run A: 5 conversations, 10 paid requests expected/);
  assert.match(dryRunText('b', b), /Run B: 7 conversations, 15 paid requests expected/);
});

test('runner, frame 11: the card turn, then "Submit request" runs the browser recheck and save with no Claude call', async () => {
  const [conversation] = readConversations('a').filter((c) => c.id.startsWith('A3'));
  const api = fakeClaude([
    useTool('submit_request', { product_id: MESHWIRE.product_id, note: 'Need this for the Q1 network migration.', po_number: '4500012345' }),
  ]);
  const record = await runConversation(conversation, api);
  assert.equal(api.callCount, 1);
  assert.equal(record.paidRequests, 1);
  assert.equal(record.expectedPaidRequests, 1);

  const [first, card] = record.steps;
  // The request is the app's own request (same builder as api/agent.js).
  assert.equal(api.requests[0].model, MODEL);
  assert.deepEqual(api.requests[0].output_config, { effort: 'low' });
  assert.equal(first.calls[0].toolCalls[0].name, 'submit_request');
  assert.deepEqual(first.buyerSees.bubbles.map((b) => b.type), ['fixed (code)', 'card (code)']);
  assert.equal(first.buyerSees.bubbles[1].poNumber, '4500012345');

  assert.equal(card.cardState, 'submitted');
  assert.equal(card.paidRequests, 0);
  assert.equal(card.historyNote, cardNotes.sent);
  assert.deepEqual(Object.keys(card.saved).sort(), ['account_id', 'date', 'experience', 'note', 'po_number', 'product_id', 'status']);
  assert.equal(card.saved.status, 'Pending');
  assert.match(card.view.bubbles[0].text, /^I sent your request for Meshwire to your administrator\./);
  assert.equal(card.view.steps[0].text, COPY.sent);
});

test('runner: a failed call is saved with its error, the run goes on, and the paid count stays exact', async () => {
  const [conversation] = readConversations('a').filter((c) => c.id.startsWith('A1'));
  const api = fakeClaude([
    useTool('search_products', { query: 'VPN' }),
    { content: [], throws: Object.assign(new Error('overloaded'), { status: 529 }) },
  ]);
  const record = await runConversation(conversation, api);
  assert.equal(record.paidRequests, 2);
  assert.equal(record.steps[0].error.errorType, 'E1a');
  assert.equal(api.callCount, 2, 'no retry');
});

test('runner: usage and cost use the Sonnet 5.5 prices', async () => {
  assert.equal(costOf({ input: 1_000_000, cacheWrite: 0, cacheRead: 0, output: 0 }), 2);
  assert.equal(costOf({ input: 0, cacheWrite: 1_000_000, cacheRead: 1_000_000, output: 1_000_000 }), 12.6);
  const [conversation] = readConversations('a').filter((c) => c.id.startsWith('A1'));
  const api = fakeClaude([
    { ...useTool('search_products', { query: 'VPN' }), usage: { input_tokens: 2000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 100 } },
    { ...say("I found 3 products that match \"VPN\". Tunnelport Access Server (BYOL) is approved for purchase. Meshwire and Shalecrest UTM 9 aren't approved."), usage: { input_tokens: 2500, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 60 } },
  ]);
  const record = await runConversation(conversation, api);
  assert.deepEqual(record.usage, { input: 4500, cacheWrite: 0, cacheRead: 0, output: 160 });
  assert.equal(record.costUsd, costOf(record.usage));
  const list = record.steps[0].buyerSees.bubbles.find((b) => b.type === 'list (code)');
  assert.deepEqual(list.items, ['Meshwire', 'Tunnelport Access Server (BYOL)', 'Shalecrest UTM 9']);
  const summary = summaryMarkdown([record], 'test');
  assert.match(summary, /\| A1-frame6-vpn \| 6 \| riley \| 2 \(expected 2\) \| claude-sonnet-5-5 \| search_products \|/);
  assert.doesNotMatch(summary, /fallback/i);
});

test('Q6: the runner records which model wrote each answer; summary.md names a fallback answer', async () => {
  const [conversation] = readConversations('a').filter((c) => c.id.startsWith('A1'));
  const api = fakeClaude([
    useTool('search_products', { query: 'VPN' }),
    {
      ...say('I found 3 products that match "VPN".'),
      model: 'claude-sonnet-5',
      usage: { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 5, iterations: [{ type: 'message' }, { type: 'fallback_message' }] },
    },
  ]);
  const record = await runConversation(conversation, api);
  const [first, second] = record.steps[0].calls;
  assert.equal(first.model, 'claude-sonnet-5-5');
  assert.equal(first.fallback, false);
  assert.equal(second.model, 'claude-sonnet-5');
  assert.equal(second.fallback, true);
  const summary = summaryMarkdown([record], 'test');
  assert.match(summary, /A fallback model answered 1 call\. See the Model column\./);
  assert.match(summary, /\| claude-sonnet-5-5, FALLBACK: claude-sonnet-5 answered \|/);
});
