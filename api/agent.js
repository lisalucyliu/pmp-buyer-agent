// The server function (POST /api/agent). Runs one buyer turn: Claude with the 3 tools, then code adds the
// List, the contact bubble and the support prompts. Streams NDJSON events (one JSON object per line) with
// the same types and fields as tests/fakeAgent.js, so the drawer code doesn't change.
// Same pattern as ~/grounded-answers/api/answer.js.
import Anthropic from '@anthropic-ai/sdk';
import { PRODUCTS } from '../shared/catalog.js';
import { choiceAnswer } from '../shared/choiceAnswer.js';
import { clarifyChoices } from '../shared/clarify.js';
import { findContacts, hasContacts } from '../shared/contacts.js';
import { COPY, lines } from '../shared/copy.js';
import { alternativesPromptShows, answerPromptItems, handOffLine, handOffProducts, listForTurn, requestPromptProduct } from '../shared/answerProducts.js';
import { UnusableResponseError, errorTypeForError } from '../server/errors.js';
import { buildMessages, readBody } from '../server/messages.js';
import { SYSTEM_PROMPT } from '../server/prompt.js';
import { TOOLS, newTurnState, runTool } from '../server/tools.js';

// Decision 117 and build-decisions.md: current Claude Sonnet, effort low.
export const MODEL = 'claude-sonnet-5-5';
// Week 1 (tiny_agent.py) used 1024. grounded-answers uses 16000. Thinking counts toward max_tokens, and a
// cap that is too low cuts the answer off (stop_reason max_tokens, shown as E1b). Answers are short, and
// only the tokens Claude writes are billed, so the higher cap costs nothing extra.
export const MAX_TOKENS = 16000;
// Cost guard: at most this many Claude calls in one buyer turn. The longest planned path is 3
// (search, alternatives, text). More than this ends the turn with E1b, so a loop can't run up the bill.
export const MAX_CALLS_PER_TURN = 4;

// Local development: load the key from .env.local (same as grounded-answers). Variables that are already
// set win, and a missing file is fine. Never printed.
if (process.env.VERCEL_ENV !== 'production') {
  try {
    process.loadEnvFile(new URL('../.env.local', import.meta.url));
  } catch {}
}

// Created on first use, so tests and `--dry-run` can import this file with no key.
let realClient = null;
export function claudeClient() {
  // maxRetries 0: no automatic retry, so each paid request is one we chose to make.
  realClient ??= new Anthropic({ maxRetries: 0 });
  return realClient;
}

// The one place that builds the request to Claude. POST and scripts/run_agent.js both call it.
// Prompt caching: one breakpoint on the system prompt caches the tools and the system prompt.
// Refusal fallback (Claude API guidance for claude-sonnet-5-5): if a safety classifier declines, the API
// runs the same request on the fallback model in the same call. It adds no paid request.
export function claudeRequest(messages) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    output_config: { effort: 'low' },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: TOOLS,
    messages,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  };
}

const HAND_OFF = /\b(contact|speak with) your administrator\b/i;
const CONTACT = /\bcontact your administrator\b/i;

function usageOf(message) {
  const usage = message.usage ?? {};
  return {
    input: usage.input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
  };
}

// Code's part after Claude's text (build plan section 2, step 5): the frame 7 dialog, the List,
// the contact bubble and the support prompts.
function afterText({ text, turn, ctx, send, listLoading }) {
  if (turn.clarify) {
    send({ type: 'clarify', query: turn.clarify.query, choices: clarifyChoices(turn.clarify.query, turn.clarify.matches) });
    return;
  }
  const items = listForTurn({ text, searchResults: turn.searchResults, alternatives: turn.alternatives });
  if (items.length || listLoading) {
    send({ type: 'products', ids: items.map((p) => p.product_id), moreHref: turn.alternatives?.moreHref ?? null });
  }
  // Hand-off bubbles from code (Lisa's answers, Nov 16, step 2 part 1 report, Q1): frame 17 (requests off)
  // and frame 18 (product can't be requested), with the spec text. Claude's text stops before them.
  const contactsYes = hasContacts(ctx.experience.branding_description);
  // Frame 19 (H3): Claude writes the hand-off itself, with no tool call. The app note told it
  // "Contact details: yes" or "no", so its line has "Contact your administrator." or "Speak with ...".
  // When Claude's text already has a hand-off, code adds none, so the buyer never gets 2 (see the
  // step 2 part 1b report: Sam asks about another team's approval of a product).
  const claudeHandOff = HAND_OFF.test(text);
  const handOffs = claudeHandOff ? [] : handOffProducts({
    text,
    searchResults: turn.searchResults,
    alternativesSubject: turn.alternativesSubject,
    notSent: turn.notSent,
    experience: ctx.experience,
  });
  const handOffText = handOffLine(handOffs, ctx.experience);
  if (handOffText) send({ type: 'stacked', text: handOffText, handOff: true });
  const handOff = handOffs.length > 0 || claudeHandOff;
  // The contact bubble: once, after the hand-off, when the ending is "contact" (the details exist).
  if (contactsYes && (handOffs.length > 0 || CONTACT.test(text))) {
    send({ type: 'contact', ...findContacts(ctx.experience.branding_description) });
  }
  // No support prompts after a hand-off (decision 58).
  if (handOff) return;
  // Frame 20 (H4): every search this turn found nothing.
  if (turn.searches > 0 && turn.emptySearches === turn.searches && !turn.alternatives) {
    send({ type: 'prompts', alignment: 'horizontal', editable: true, items: [{ id: 'find-approved', text: COPY.promptFindApproved }] });
    return;
  }
  const product = requestPromptProduct({
    text,
    searchResults: turn.searchResults,
    alternativesSubject: turn.alternativesSubject,
    buyer: ctx.buyer,
    experience: ctx.experience,
    requests: ctx.requests,
    products: PRODUCTS,
    handOff,
  });
  if (product) {
    // Week 7, C5 (Lisa, Nov 22): "Show approved alternatives" next to the request prompt.
    const showAlternatives = alternativesPromptShows({
      text,
      searchResults: turn.searchResults,
      alternatives: turn.alternatives,
      requestProduct: product,
      flags: ctx.flags,
      experience: ctx.experience,
    });
    send({ type: 'prompts', alignment: 'vertical', editable: false, items: answerPromptItems(product, showAlternatives) });
  }
}

// Frame 7 answer: code only, no Claude call (shared/choiceAnswer.js).
function runChoiceTurn(ctx, send) {
  const answer = choiceAnswer(ctx.choice, ctx.experience.id);
  const turn = newTurnState();
  turn.searchResults.push(...answer.products);
  send({ type: 'step', id: 'step-1', status: 'loading', text: answer.stepLoading });
  send({ type: 'step', id: 'step-1', status: 'success', text: answer.stepDone, header: answer.stepHeader });
  send({ type: 'text', delta: answer.text });
  afterText({ text: answer.text, turn, ctx, send, listLoading: false });
  send({ type: 'done' });
  return { calls: [], text: answer.text };
}

// One buyer turn. `api` is the Anthropic client (a fake one in free tests). `send` gets each UI event.
// Returns what the runner saves: each Claude call (request, tool calls, tool results, usage) and the text.
// Throws on a failure. POST turns that into an `error` event.
export async function runAgentTurn({ body, api, send, onStream = () => {} }) {
  const ctx = readBody(body);
  if (ctx.error) throw new Error(ctx.error);
  if (ctx.choice) return runChoiceTurn(ctx, send);

  const calls = [];
  try {
    return await runClaudeTurn({ ctx, api, send, onStream, calls });
  } catch (error) {
    // The runner counts every paid request, also the ones before a failure.
    error.calls = calls;
    throw error;
  }
}

async function runClaudeTurn({ ctx, api, send, onStream, calls }) {
  const turn = newTurnState();
  const toolCtx = { ...ctx, turn };
  const messages = buildMessages(ctx);
  let text = '';
  let listLoading = false;

  for (let call = 0; ; call += 1) {
    if (call >= MAX_CALLS_PER_TURN) throw new Error(`More than ${MAX_CALLS_PER_TURN} Claude calls in one turn`);
    const request = claudeRequest([...messages]);
    const record = { request, toolCalls: [], toolResults: [] };
    calls.push(record);

    const stream = api.beta.messages.stream(request);
    onStream(stream);
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        // 8b: the List is coming. Shown while the text streams, when this turn found products.
        if (!listLoading && !turn.clarify && (turn.searchResults.length || turn.alternatives?.items.length)) {
          listLoading = true;
          send({ type: 'products_loading' });
        }
        text += event.delta.text;
        send({ type: 'text', delta: event.delta.text });
      }
    }
    const message = await stream.finalMessage();
    record.stopReason = message.stop_reason;
    // Which model wrote this answer. With the refusal fallback, usage.iterations has a "fallback_message"
    // entry when the fallback model answered (Lisa's answers, Nov 16, step 2 part 1 report, Q6).
    record.model = message.model;
    record.iterations = message.usage?.iterations ?? null;
    record.fallback = (message.usage?.iterations ?? []).some((entry) => entry.type === 'fallback_message');
    record.usage = usageOf(message);
    if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') throw new UnusableResponseError(message.stop_reason);
    if (message.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: message.content });
    const results = [];
    let ended = false;
    for (const block of message.content.filter((b) => b.type === 'tool_use')) {
      const result = runTool(block.name, block.input, toolCtx);
      record.toolCalls.push({ name: block.name, input: block.input });
      record.toolResults.push({ name: block.name, text: result.text, endTurn: result.endTurn });
      result.events.forEach(send);
      if (result.endTurn) ended = true;
      else results.push({ type: 'tool_result', tool_use_id: block.id, content: result.text, ...(result.isError ? { is_error: true } : {}) });
    }
    // The card, the note ask or a duplicate ends the turn. No more Claude calls (build plan section 2).
    if (ended) {
      send({ type: 'done' });
      return { calls, text };
    }
    messages.push({ role: 'user', content: results });
  }

  afterText({ text, turn, ctx, send, listLoading });
  send({ type: 'done' });
  return { calls, text };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const checked = readBody(body);
  if (checked.error) return new Response(checked.error, { status: 400 });

  const encoder = new TextEncoder();
  let claudeStream = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    claudeStream?.abort();
  };
  request.signal?.addEventListener('abort', stop);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        if (!stopped) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const result = await runAgentTurn({ body, api: claudeClient(), send, onStream: (s) => { claudeStream = s; } });
        for (const call of result.calls) {
          console.log(`[agent] call: stop_reason=${call.stopReason} input=${call.usage?.input} cache_write=${call.usage?.cacheWrite} cache_read=${call.usage?.cacheRead} output=${call.usage?.output}`);
        }
      } catch (error) {
        if (stopped) return;
        console.error('[agent] turn failed:', error.message);
        send({ type: 'error', errorType: errorTypeForError(error) });
      }
      if (!stopped) controller.close();
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
