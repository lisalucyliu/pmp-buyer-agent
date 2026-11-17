// Runs scripted conversations against real Claude and saves what the buyer would see. Paid runs A and B.
// Every Claude call costs money. Same idea as ~/grounded-answers/scripts/run_evals.js.
//
//   node scripts/run_agent.js --run a --dry-run        print the plan and the paid request count, 0 calls
//   node scripts/run_agent.js --run a --label run-a    run it (needs ANTHROPIC_API_KEY in .env.local)
//   add --only A1,A3 to run some conversations only
//
// Each buyer message goes through runAgentTurn in api/agent.js: the same request builder and the same
// tool code as the app. Card buttons run the browser's code (src/drawer/conversationLogic.js) with no
// Claude call. Results go to runs/<date>-<label>/: one JSON file per conversation and summary.md.
// No retries: a failed call is saved and the run goes on, so the paid count stays exact.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sampleRequests from '../data/sampleRequests.json' with { type: 'json' };
import { MAX_CALLS_PER_TURN, claudeClient, runAgentTurn } from '../api/agent.js';
import { experienceFor, findBuyer, findProduct } from '../shared/catalog.js';
import { COPY, lines } from '../shared/copy.js';
import { errorTypeForError } from '../server/errors.js';
import { SYSTEM_PROMPT } from '../server/prompt.js';
import { TOOLS } from '../server/tools.js';
import {
  applyEventToConversation, cancelOutcome, fixedText, requestBody, submitOutcome, turnText,
} from '../src/drawer/conversationLogic.js';
import { frame5HistoryText, frame5Turn } from '../src/state/frame5.js';
import { newId } from '../src/state/ids.js';

const CONVERSATIONS = new URL('./conversations/', import.meta.url);
const RUNS = new URL('../runs/', import.meta.url);

// Dollars per million tokens for claude-sonnet-5-5 (prompt-2.md): $2 input, $2.50 cache write (5 minutes),
// $0.10 cache read, $10 output.
export const PRICES = { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 };
export function costOf(usage = {}) {
  const dollars = Object.keys(PRICES).reduce((sum, key) => sum + ((usage[key] ?? 0) * PRICES[key]) / 1_000_000, 0);
  return Number(dollars.toFixed(6));
}

export const EMPTY_CONVERSATION = {
  turns: [],
  history: [],
  flags: { noteAsked: false, alternativesShown: false, alternativesDeclined: false },
  subjectProductId: null,
  clarify: null,
};

// Paid requests a step will make: the script's expected count. A buyer message can make up to
// MAX_CALLS_PER_TURN calls (the server's cost guard). Card buttons and frame 7 choices make none.
export function planOf(conversation) {
  const expected = conversation.steps.reduce((sum, step) => sum + (step.say ? step.expectedPaidRequests : 0), 0);
  const most = conversation.steps.filter((step) => step.say).length * MAX_CALLS_PER_TURN;
  return { expected, most };
}

export function readConversations(run) {
  const folder = new URL(`run-${run}/`, CONVERSATIONS);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(new URL(name, folder), 'utf8')));
}

// What the buyer sees in one assistant turn, in order.
export function buyerView(turn) {
  return {
    steps: turn.steps.map((step) => ({ header: step.header ?? null, text: step.text, status: step.status })),
    bubbles: turn.blocks.map((block) => {
      if (block.type === 'text') return { type: 'text (Claude)', text: block.text };
      if (block.type === 'stacked') return { type: 'stacked', text: block.text };
      if (block.type === 'fixed') return { type: 'fixed (code)', text: fixedText(block) };
      if (block.type === 'list') return { type: 'list (code)', items: (block.ids ?? []).map((id) => findProduct(id).name), moreHref: block.moreHref ?? null };
      if (block.type === 'contact') return { type: 'contact (code)', email: block.email, slack: block.slack };
      if (block.type === 'card') return { type: 'card (code)', heading: lines.cardHeading(findProduct(block.productId).name), note: block.note, poNumber: block.poNumber, state: block.state };
      return { type: block.type };
    }),
    prompts: turn.prompts?.items.map((item) => item.text) ?? [],
    error: turn.errorType ?? null,
  };
}

// One conversation, the way the drawer runs it.
export class Session {
  constructor(conversation) {
    this.buyer = findBuyer(conversation.buyer);
    this.experience = experienceFor(this.buyer);
    this.requests = sampleRequests.filter((r) => r.account_id === this.buyer.account_id).map((r) => ({ ...r }));
    this.conversation = { ...EMPTY_CONVERSATION, flags: { ...EMPTY_CONVERSATION.flags } };
    this.clarify = null;
    // Frame 5: "Request approval" on a product page (src/state/store.jsx, openDrawerForProduct).
    if (conversation.start?.requestApproval) {
      const productId = conversation.start.requestApproval;
      const c = this.conversation;
      this.conversation = {
        ...c,
        turns: [...c.turns, frame5Turn(productId)],
        history: [...c.history, { role: 'assistant', content: frame5HistoryText(productId) }],
        flags: { ...c.flags, noteAsked: true },
        subjectProductId: productId,
      };
    }
  }

  addAssistantTurn(turn, historyNote) {
    const full = { kind: 'assistant', id: newId('t'), status: 'done', steps: [], blocks: [], prompts: null, ...turn };
    const c = this.conversation;
    this.conversation = {
      ...c,
      turns: [...c.turns, full],
      history: [...c.history, ...(historyNote ? [{ role: 'tool_result', content: historyNote }] : []), { role: 'assistant', content: turnText(full) }],
    };
    return full;
  }

  setCardState(cardId, state) {
    const c = this.conversation;
    this.conversation = {
      ...c,
      turns: c.turns.map((turn) => ({ ...turn, blocks: turn.blocks?.map((b) => (b.id === cardId ? { ...b, state } : b)) })),
    };
  }

  openCard() {
    for (const turn of [...this.conversation.turns].reverse()) {
      const card = turn.blocks?.find((b) => b.type === 'card' && b.state === 'open');
      if (card) return card;
    }
    return null;
  }

  // A buyer message (or a frame 7 choice): one call to runAgentTurn.
  async say(message, api, choice = null) {
    const body = requestBody({ conversation: this.conversation, buyer: this.buyer, requests: this.requests, message, choice });
    const turnId = newId('t');
    const c = this.conversation;
    this.conversation = {
      ...c,
      history: body.messages,
      clarify: null,
      turns: [...c.turns, { kind: 'user', id: newId('u'), text: message }, { kind: 'assistant', id: turnId, status: 'streaming', steps: [], blocks: [], prompts: null }],
    };
    const events = [];
    let result = { calls: [], text: '' };
    let error = null;
    try {
      result = await runAgentTurn({
        body,
        api,
        send: (event) => {
          events.push(event);
          this.conversation = applyEventToConversation(this.conversation, turnId, event);
        },
      });
    } catch (caught) {
      error = { message: caught.message, errorType: errorTypeForError(caught) };
      result = { calls: caught.calls ?? [], text: '' };
    }
    const turn = this.conversation.turns.find((t) => t.id === turnId);
    const done = { ...turn, status: error ? 'error' : 'done', ...(error ? { errorType: error.errorType } : {}) };
    this.conversation = {
      ...this.conversation,
      history: error ? this.conversation.history : [...this.conversation.history, { role: 'assistant', content: turnText(done) }],
      turns: this.conversation.turns.map((t) => (t.id === turnId ? done : t)),
    };
    return { body, events, calls: result.calls, error, view: buyerView(done) };
  }

  // "Submit request": the browser's recheck and save, with no Claude call.
  submitCard() {
    const card = this.openCard();
    if (!card) return { error: 'No open card' };
    const outcome = submitOutcome({ card, buyer: this.buyer, experience: this.experience, requests: this.requests });
    this.setCardState(card.id, outcome.cardState);
    if (!outcome.record) {
      const turn = this.addAssistantTurn({ blocks: outcome.blocks }, outcome.historyNote);
      return { cardState: outcome.cardState, view: buyerView(turn), historyNote: outcome.historyNote };
    }
    this.requests = [{ request_id: `req-run-${this.requests.length + 1}`, ...outcome.record }, ...this.requests];
    // The browser adds this turn empty, then fills in the sent line after the save (useAgent.js).
    const turn = this.addAssistantTurn({}, outcome.historyNote);
    const sentTurn = { ...turn, steps: [{ id: 'send', status: 'success', text: COPY.sent }], blocks: [{ type: 'fixed', id: newId('b'), key: 'sent', productId: card.productId }] };
    this.conversation = { ...this.conversation, turns: this.conversation.turns.map((t) => (t.id === turn.id ? sentTurn : t)) };
    return { cardState: outcome.cardState, view: buyerView(sentTurn), historyNote: outcome.historyNote, saved: outcome.record };
  }

  cancelCard() {
    const card = this.openCard();
    if (!card) return { error: 'No open card' };
    const outcome = cancelOutcome({ flags: this.conversation.flags });
    this.setCardState(card.id, outcome.cardState);
    this.conversation = { ...this.conversation, subjectProductId: card.productId };
    const turn = this.addAssistantTurn({ blocks: outcome.blocks, prompts: outcome.prompts }, outcome.historyNote);
    return { cardState: outcome.cardState, view: buyerView(turn), historyNote: outcome.historyNote };
  }
}

// Each Claude call as saved: the messages (the system prompt and tools are saved once per file),
// tool calls and results, stop reason, model, usage and cost.
function savedCall(call) {
  const { system, tools, ...rest } = call.request;
  return {
    request: rest, toolCalls: call.toolCalls, toolResults: call.toolResults, stopReason: call.stopReason,
    model: call.model, fallback: call.fallback ?? false, iterations: call.iterations ?? null,
    usage: call.usage, costUsd: costOf(call.usage),
  };
}

export async function runConversation(conversation, api) {
  const session = new Session(conversation);
  const steps = [];
  for (const step of conversation.steps) {
    if (step.say) {
      const turn = await session.say(step.say, api);
      steps.push({ say: step.say, expectedPaidRequests: step.expectedPaidRequests, paidRequests: turn.calls.length, requestBody: turn.body, calls: turn.calls.map(savedCall), uiEvents: turn.events, buyerSees: turn.view, error: turn.error });
    } else if (step.choose) {
      const choice = session.conversation.clarify?.choices.find((c) => c.label === step.choose) ?? null;
      if (!choice) {
        steps.push({ choose: step.choose, error: 'No open frame 7 dialog with this choice' });
        continue;
      }
      const turn = await session.say(choice.label, api, choice);
      steps.push({ choose: step.choose, paidRequests: turn.calls.length, uiEvents: turn.events, buyerSees: turn.view, error: turn.error });
    } else if (step.card === 'submit') {
      steps.push({ card: 'submit', paidRequests: 0, ...session.submitCard() });
    } else if (step.card === 'cancel') {
      steps.push({ card: 'cancel', paidRequests: 0, ...session.cancelCard() });
    }
  }
  const calls = steps.flatMap((s) => s.calls ?? []);
  const usage = calls.reduce((sum, c) => {
    for (const key of Object.keys(PRICES)) sum[key] = (sum[key] ?? 0) + (c.usage?.[key] ?? 0);
    return sum;
  }, {});
  return {
    id: conversation.id,
    frame: conversation.frame,
    buyer: conversation.buyer,
    start: conversation.start,
    lookFor: conversation.lookFor ?? null,
    systemPrompt: SYSTEM_PROMPT,
    tools: TOOLS,
    steps,
    paidRequests: calls.length,
    expectedPaidRequests: planOf(conversation).expected,
    usage,
    costUsd: costOf(usage),
  };
}

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

export function summaryMarkdown(records, label) {
  const total = records.reduce((sum, r) => sum + r.costUsd, 0);
  const paid = records.reduce((sum, r) => sum + r.paidRequests, 0);
  const fallbacks = records.flatMap((r) => r.steps.flatMap((s) => s.calls ?? [])).filter((c) => c.fallback).length;
  const rows = records.map((r) => {
    const said = r.steps.filter((s) => s.say || s.choose);
    const tools = said.flatMap((s) => (s.calls ?? []).flatMap((c) => c.toolCalls.map((t) => t.name + (t.input?.alternatives_for ? ' (alternatives)' : '')))).join(', ');
    const sees = r.steps
      .map((s) => s.buyerSees?.bubbles.map((b) => b.text ?? (b.items ? `List: ${b.items.join(', ')}` : b.heading ?? b.type)).join(' / ') ?? (s.card ? `Card: ${s.cardState}` : ''))
      .filter(Boolean)
      .join(' // ');
    const errors = r.steps.map((s) => s.error?.message ?? s.error).filter(Boolean).join('; ');
    // Which model wrote each answer. A fallback answer is named as one (Q6).
    const allCalls = said.flatMap((s) => s.calls ?? []);
    const models = [...new Set(allCalls.map((c) => (c.fallback ? `FALLBACK: ${c.model} answered` : c.model)))].join(', ');
    return `| ${cell(r.id)} | ${cell(r.frame)} | ${cell(r.buyer)} | ${r.paidRequests} (expected ${r.expectedPaidRequests}) | ${cell(models || 'no call')} | ${cell(tools || 'none')} | ${cell(sees)} | $${r.costUsd.toFixed(4)} | ${cell(errors || '-')} |`;
  });
  return [
    `# ${label}`,
    '',
    `${records.length} conversations, ${paid} paid requests, $${total.toFixed(4)}.`,
    ...(fallbacks ? ['', `A fallback model answered ${fallbacks} ${fallbacks === 1 ? 'call' : 'calls'}. See the Model column.`] : []),
    '',
    '| Conversation | Frame | Buyer | Paid requests | Model | Tools called | What the buyer sees | Cost | Error |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

export function dryRunText(run, conversations) {
  const out = [];
  let expected = 0;
  let most = 0;
  for (const conversation of conversations) {
    const plan = planOf(conversation);
    expected += plan.expected;
    most += plan.most;
    const start = conversation.start?.requestApproval
      ? `Request approval on the ${findProduct(conversation.start.requestApproval).name} page (frame 5, no Claude call)`
      : conversation.start?.from ?? 'trigger bar';
    out.push(`${conversation.id} (frame ${conversation.frame}, ${conversation.buyer}), starts from: ${start}`);
    for (const step of conversation.steps) {
      if (step.say) out.push(`  buyer: "${step.say}"  -> ${step.expectedPaidRequests} paid requests`);
      if (step.choose) out.push(`  choice: "${step.choose}"  -> 0 paid requests (code answers)`);
      if (step.card) out.push(`  card: ${step.card}  -> 0 paid requests (browser code)`);
    }
    out.push(`  paid requests: ${plan.expected} expected, ${plan.most} at most`);
  }
  out.push('', `Run ${run.toUpperCase()}: ${conversations.length} conversations, ${expected} paid requests expected, ${most} at most (cost guard: ${MAX_CALLS_PER_TURN} calls per buyer message).`);
  return out.join('\n');
}

async function main() {
  const run = argument('run');
  if (!run) throw new Error('Use: node scripts/run_agent.js --run a|b [--dry-run] [--label name] [--only A1,A2]');
  const only = argument('only')?.split(',');
  const conversations = readConversations(run).filter((c) => !only || only.some((id) => c.id.startsWith(id)));
  if (!conversations.length) throw new Error('No conversations match');

  if (process.argv.includes('--dry-run')) {
    console.log(dryRunText(run, conversations));
    return;
  }
  const label = argument('label') ?? `run-${run}`;
  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const folder = new URL(`${date}-${label}/`, RUNS);
  const taken = conversations.filter((c) => existsSync(new URL(`${c.id}.json`, folder)));
  if (taken.length) throw new Error(`Already saved, not paying twice: ${taken.map((c) => c.id).join(', ')}`);
  mkdirSync(folder, { recursive: true });

  const plan = conversations.reduce((sum, c) => sum + planOf(c).expected, 0);
  console.log(`Run ${run.toUpperCase()}: ${conversations.length} conversations, about ${plan} paid requests.`);
  const api = claudeClient();
  const records = [];
  for (const conversation of conversations) {
    console.log(`${conversation.id}...`);
    const record = await runConversation(conversation, api);
    writeFileSync(new URL(`${conversation.id}.json`, folder), `${JSON.stringify(record, null, 2)}\n`);
    records.push(record);
  }
  writeFileSync(new URL('summary.md', folder), summaryMarkdown(records, `${date}-${label}`));
  const paid = records.reduce((sum, r) => sum + r.paidRequests, 0);
  const total = records.reduce((sum, r) => sum + r.costUsd, 0);
  console.log(`Done: ${paid} paid requests, $${total.toFixed(4)}. Saved in runs/${date}-${label}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Stopped: ${error.message}`);
    process.exitCode = 1;
  });
}
