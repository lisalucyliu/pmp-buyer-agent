// Runs scripted conversations against real Claude and saves what the buyer would see. Paid runs A and B.
// Every Claude call costs money. Same idea as ~/grounded-answers/scripts/run_evals.js.
//
//   node scripts/run_agent.js --run a --dry-run        print the plan and the paid request count, 0 calls
//   node scripts/run_agent.js --run a --label run-a    run it (needs ANTHROPIC_API_KEY in .env.local)
//   add --only A1,A3 to run some conversations only
//   --run takes a list: --run a,b,c runs all 15 cases into one folder. For pass^3 (Week 7), run it
//   3 times with 3 labels, then grade with scripts/grade_runs.js.
//
// Each buyer message goes through runAgentTurn in api/agent.js: the same request builder and the same
// tool code as the app. Card buttons run the browser's code (src/drawer/conversationLogic.js) with no
// Claude call. Results go to runs/<date>-<label>/: one JSON file per conversation and summary.md.
// No retries: a failed call is saved and the run goes on, so the paid count stays exact.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sampleRequests from '../data/sampleRequests.json' with { type: 'json' };
import { MAX_CALLS_PER_TURN, claudeClient, runAgentTurn } from '../api/agent.js';
import { PRODUCTS, experienceFor, findBuyer, findProduct } from '../shared/catalog.js';
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

// Test-only products (Week 7, C2). A case file can list "testProducts". The runner adds them to the
// catalog in memory for that one case and removes them after it, also after an error. The app, the
// API and data/catalog.json never hold them (tests/unit/evals.test.js).
export async function withTestProducts(products = [], run) {
  const taken = products.filter((p) => findProduct(p.product_id));
  if (taken.length) throw new Error(`Test product ID already in the catalog: ${taken.map((p) => p.product_id).join(', ')}`);
  PRODUCTS.push(...products);
  try {
    return await run();
  } finally {
    for (const product of products) {
      const index = PRODUCTS.findIndex((p) => p.product_id === product.product_id);
      if (index !== -1) PRODUCTS.splice(index, 1);
    }
  }
}

export function readConversations(run) {
  const folder = new URL(`run-${run}/`, CONVERSATIONS);
  return readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(new URL(name, folder), 'utf8')));
}

// What the buyer sees in one assistant turn, in order.
// clarify: the frame 7 dialog this turn left open (conversation.clarify), or null. The dialog shows after the bubbles.
// textBy: who wrote the turn's text. 'code' for a frame 7 choice answer (shared/choiceAnswer.js, no Claude call).
export function buyerView(turn, clarify = null, { textBy = 'Claude' } = {}) {
  const dialog = clarify && clarify.turnId === turn.id
    ? [{ type: 'frame 7 dialog (code)', query: clarify.query, choices: clarify.choices.map((c) => c.label) }]
    : [];
  return {
    steps: turn.steps.map((step) => ({ header: step.header ?? null, text: step.text, status: step.status })),
    bubbles: [...turn.blocks.map((block) => {
      if (block.type === 'text') return { type: `text (${textBy})`, text: block.text };
      // The hand-off bubble (frames 17, 18): code writes it (api/agent.js, afterText), never Claude.
      if (block.type === 'stacked') return { type: 'stacked (code)', text: block.text };
      if (block.type === 'fixed') return { type: 'fixed (code)', text: fixedText(block) };
      if (block.type === 'list') return { type: 'list (code)', items: (block.ids ?? []).map((id) => findProduct(id).name), moreHref: block.moreHref ?? null };
      if (block.type === 'contact') return { type: 'contact (code)', email: block.email, slack: block.slack };
      if (block.type === 'card') return { type: 'card (code)', heading: lines.cardHeading(findProduct(block.productId).name), note: block.note, poNumber: block.poNumber, state: block.state };
      return { type: block.type };
    }), ...dialog],
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
    // A frame 7 choice is answered by code (api/agent.js, runChoiceTurn), so its text is code text.
    const view = buyerView(done, this.conversation.clarify, { textBy: choice ? 'code' : 'Claude' });
    return { body, events, calls: result.calls, error, view };
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

export function runConversation(conversation, api) {
  return withTestProducts(conversation.testProducts, () => runConversationSteps(conversation, api));
}

async function runConversationSteps(conversation, api) {
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
    checks: conversation.checks ?? null,
    testProducts: conversation.testProducts ?? null,
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

// One bubble as text. Code text is labeled, for example "Text (code):", so Lisa can see who wrote it.
export function bubbleText(b) {
  if (b.choices) return `Frame 7 dialog: ${b.choices.join(', ')}`;
  if (b.type === 'text (code)') return `Text (code): ${b.text}`;
  if (b.type === 'stacked (code)') return `Stacked (code): ${b.text}`;
  return b.text ?? (b.items ? `List: ${b.items.join(', ')}` : b.heading ?? b.type);
}

// What the buyer sees in a record: the bubbles of each step, steps split by " // ".
// withPrompts adds the support prompts (grades.md uses it).
export function seesText(record, { withPrompts = false } = {}) {
  return record.steps
    .map((s) => {
      if (!s.buyerSees) return s.card ? `Card: ${s.cardState}` : '';
      const prompts = withPrompts && s.buyerSees.prompts.length ? [`Prompts: ${s.buyerSees.prompts.join(', ')}`] : [];
      return [...s.buyerSees.bubbles.map(bubbleText), ...prompts].join(' / ');
    })
    .filter(Boolean)
    .join(' // ');
}

export function summaryMarkdown(records, label) {
  const total = records.reduce((sum, r) => sum + r.costUsd, 0);
  const paid = records.reduce((sum, r) => sum + r.paidRequests, 0);
  const fallbacks = records.flatMap((r) => r.steps.flatMap((s) => s.calls ?? [])).filter((c) => c.fallback).length;
  const rows = records.map((r) => {
    const said = r.steps.filter((s) => s.say || s.choose);
    const tools = said.flatMap((s) => (s.calls ?? []).flatMap((c) => c.toolCalls.map((t) => t.name + (t.input?.alternatives_for ? ' (alternatives)' : '')))).join(', ');
    const sees = seesText(r);
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

// Dry run for a list of runs (--run a,b,c): each run's plan, then the total for 1 time and for 3 times.
export function dryRunListText(runs, conversationsByRun) {
  const parts = runs.map((run) => dryRunText(run, conversationsByRun[run]));
  if (runs.length === 1) return parts[0];
  const all = runs.flatMap((run) => conversationsByRun[run]);
  const expected = all.reduce((sum, c) => sum + planOf(c).expected, 0);
  const most = all.reduce((sum, c) => sum + planOf(c).most, 0);
  const name = runs.map((r) => r.toUpperCase()).join(', ');
  return [
    parts.join('\n\n'),
    '',
    `Total for runs ${name}, 1 time: ${all.length} conversations, ${expected} paid requests expected, ${most} at most.`,
    `Total for 3 times (pass^3): ${expected * 3} paid requests expected, ${most * 3} at most.`,
  ].join('\n');
}

async function main() {
  const run = argument('run');
  if (!run) throw new Error('Use: node scripts/run_agent.js --run a|b|c or a,b,c [--dry-run] [--label name] [--only A1,A2]');
  const runs = run.split(',').map((r) => r.trim()).filter(Boolean);
  const only = argument('only')?.split(',');
  const byRun = Object.fromEntries(runs.map((r) => [r, readConversations(r).filter((c) => !only || only.some((id) => c.id.startsWith(id)))]));
  const conversations = runs.flatMap((r) => byRun[r]);
  if (!conversations.length) throw new Error('No conversations match');

  if (process.argv.includes('--dry-run')) {
    console.log(dryRunListText(runs, byRun));
    return;
  }
  const label = argument('label') ?? `run-${runs.join('')}`;
  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const folder = new URL(`${date}-${label}/`, RUNS);
  const taken = conversations.filter((c) => existsSync(new URL(`${c.id}.json`, folder)));
  if (taken.length) throw new Error(`Already saved, not paying twice: ${taken.map((c) => c.id).join(', ')}`);
  mkdirSync(folder, { recursive: true });

  const plan = conversations.reduce((sum, c) => sum + planOf(c).expected, 0);
  console.log(`Run ${runs.map((r) => r.toUpperCase()).join(', ')}: ${conversations.length} conversations, about ${plan} paid requests.`);
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
