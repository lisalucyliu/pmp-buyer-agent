// Code checks for the Week 7 evals. Each check reads only what a saved run record holds
// (runs/<date>-<label>/<case>.json, written by scripts/run_agent.js). No Claude call, no model grader.
// Checks test exact things: tools called or not, card, saved request, buyer-sees text, List, prompts.
// Checks never judge meaning (tone, truth of facts). Lisa grades those by hand in grades.md.
//
// A check is { type, ...options }. Add "step": n (1 is the first step) to check one step only.
// Buyer-sees text checks take "from": "claude" (text Claude wrote, the default), "code" or "any".

const asList = (value) => (Array.isArray(value) ? value : [value]);

function stepsFor(record, check) {
  if (!check.step) return record.steps;
  const step = record.steps[check.step - 1];
  return step ? [step] : [];
}

const viewOf = (step) => step.buyerSees ?? step.view ?? null;
const callsOf = (steps) => steps.flatMap((step) => step.calls ?? []);
const toolCallsOf = (steps) => callsOf(steps).flatMap((call) => call.toolCalls ?? []);
const bubblesOf = (steps) => steps.flatMap((step) => viewOf(step)?.bubbles ?? []);
const listsOf = (steps) => bubblesOf(steps).filter((b) => b.type === 'list (code)');
const promptsOf = (steps) => steps.flatMap((step) => viewOf(step)?.prompts ?? []);

const fromClaude = (bubble) => bubble.type === 'text (Claude)';
// Text a bubble shows. A card shows its heading and note.
const bubbleText = (bubble) => [bubble.text, bubble.heading, bubble.note].filter(Boolean).join(' ');
function textOf(steps, from = 'claude') {
  const bubbles = bubblesOf(steps).filter((b) => (from === 'claude' ? fromClaude(b) : from === 'code' ? !fromClaude(b) : true));
  return bubbles.map(bubbleText).join('\n');
}

// Tool input match: each given key must equal the call's value. null means the key is not in the call.
// inputHas: keys that must be in the call, with any value.
function inputMatches(call, input = {}, inputHas = []) {
  return Object.entries(input).every(([key, value]) => (value === null ? call.input?.[key] === undefined : call.input?.[key] === value))
    && inputHas.every((key) => call.input?.[key] !== undefined);
}
const matchingCalls = (steps, check) => toolCallsOf(steps).filter((t) => (!check.tool || t.name === check.tool) && inputMatches(t, check.input, check.inputHas));

const sameList = (a, b) => a.length === b.length && a.every((item, i) => item === b[i]);
const quote = (items) => asList(items).map((t) => `"${t}"`).join(', ');
const inputLabel = (input, inputHas = []) => {
  if (!input && !inputHas.length) return '';
  const given = [...Object.entries(input ?? {}).filter(([, v]) => v !== null).map(([k, v]) => `${k} ${v}`), ...inputHas];
  const absent = Object.entries(input ?? {}).filter(([, v]) => v === null).map(([k]) => k);
  return [given.length ? ` with ${given.join(', ')}` : '', absent.length ? ` without ${absent.join(', ')}` : ''].join('');
};
const stepLabel = (check) => (check.step ? ` (step ${check.step})` : '');
const fromLabel = (check) => ({ claude: "Claude's text", code: "code's text", any: 'what the buyer sees' })[check.from ?? 'claude'];

// Each type: label (the check in plain words) and test (true when it passes).
export const CHECK_TYPES = {
  toolCalled: {
    label: (c) => `${c.tool} called${inputLabel(c.input, c.inputHas)}`,
    test: (steps, c) => matchingCalls(steps, c).length > 0,
  },
  toolNotCalled: {
    label: (c) => `no ${c.tool} call${inputLabel(c.input, c.inputHas)}`,
    test: (steps, c) => matchingCalls(steps, c).length === 0,
  },
  toolCallCount: {
    label: (c) => `${c.tool ?? 'tools'} called exactly ${c.count} ${c.count === 1 ? 'time' : 'times'}${inputLabel(c.input, c.inputHas)}`,
    test: (steps, c) => matchingCalls(steps, c).length === c.count,
  },
  toolResultIncludes: {
    label: (c) => `${c.tool} result includes ${quote(c.text)}`,
    test: (steps, c) => callsOf(steps).flatMap((call) => call.toolResults ?? [])
      .some((r) => r.name === c.tool && asList(c.text).every((t) => String(r.text ?? '').includes(t))),
  },
  cardShown: {
    label: () => 'the card shows',
    test: (steps) => bubblesOf(steps).some((b) => b.type === 'card (code)'),
  },
  cardNotShown: {
    label: () => 'no card',
    test: (steps) => !bubblesOf(steps).some((b) => b.type === 'card (code)'),
  },
  cardHas: {
    label: (c) => `the card has ${[...(c.noteFilled ? ['a note'] : []), ...(c.poNumber ? [`PO number ${c.poNumber}`] : [])].join(' and ')}`,
    test: (steps, c) => bubblesOf(steps).some((b) => b.type === 'card (code)'
      && (!c.noteFilled || Boolean(String(b.note ?? '').trim()))
      && (!c.poNumber || b.poNumber === c.poNumber)),
  },
  cardState: {
    label: (c) => `card state ${c.state}`,
    test: (steps, c) => steps.some((s) => s.cardState === c.state),
  },
  requestSaved: {
    label: (c) => `request saved${c.fields ? ` with only these fields: ${c.fields.join(', ')}` : ''}`,
    test: (steps, c) => steps.some((s) => s.saved && (!c.fields || sameList(Object.keys(s.saved).sort(), [...c.fields].sort()))),
  },
  requestNotSaved: {
    label: () => 'no request saved',
    test: (steps) => !steps.some((s) => s.saved),
  },
  seesIncludes: {
    label: (c) => `${fromLabel(c)} includes ${quote(c.text)}`,
    test: (steps, c) => asList(c.text).every((t) => textOf(steps, c.from).includes(t)),
  },
  seesIncludesAny: {
    label: (c) => `${fromLabel(c)} includes one of ${quote(c.text)}`,
    test: (steps, c) => asList(c.text).some((t) => textOf(steps, c.from).includes(t)),
  },
  seesExcludes: {
    label: (c) => `${fromLabel(c)} excludes ${quote(c.text)}`,
    test: (steps, c) => !asList(c.text).some((t) => textOf(steps, c.from).toLowerCase().includes(t.toLowerCase())),
  },
  textStartsWith: {
    label: (c) => `Claude's text starts with "${c.text}"`,
    test: (steps, c) => textOf(steps, 'claude').trim().startsWith(c.text),
  },
  textEquals: {
    label: (c) => `Claude's text is exactly "${c.text}"`,
    test: (steps, c) => textOf(steps, 'claude').trim() === c.text,
  },
  listEquals: {
    label: (c) => `List is exactly, in this order: ${c.items.join(', ')}`,
    test: (steps, c) => listsOf(steps).some((l) => sameList(l.items, c.items)),
  },
  listIncludes: {
    label: (c) => `List has ${c.items.join(' and ')} (any order)`,
    test: (steps, c) => listsOf(steps).some((l) => c.items.every((item) => l.items.includes(item))),
  },
  noList: {
    label: () => 'no List',
    test: (steps) => listsOf(steps).length === 0,
  },
  promptsEqual: {
    label: (c) => `prompts are exactly: ${c.items.join(', ')}`,
    test: (steps, c) => sameList(promptsOf(steps), c.items),
  },
  promptsInclude: {
    label: (c) => `prompts include ${quote(c.items)}`,
    test: (steps, c) => c.items.every((item) => promptsOf(steps).includes(item)),
  },
  noPrompts: {
    label: () => 'no prompts',
    test: (steps) => promptsOf(steps).length === 0,
  },
  bubbleShown: {
    label: (c) => `${c.bubble} bubble shows${c.includes ? ` with ${quote(c.includes)}` : ''}`,
    test: (steps, c) => bubblesOf(steps).some((b) => b.type === c.bubble && (!c.includes || bubbleText(b).includes(c.includes))),
  },
  bubbleNotShown: {
    label: (c) => `no ${c.bubble} bubble`,
    test: (steps, c) => !bubblesOf(steps).some((b) => b.type === c.bubble),
  },
  noStepLine: {
    label: () => 'no step line',
    test: (steps) => steps.every((s) => !(viewOf(s)?.steps?.length)),
  },
  paidRequests: {
    label: (c) => `${c.count} paid requests`,
    test: (steps, c) => steps.reduce((sum, s) => sum + (s.paidRequests ?? 0), 0) === c.count,
  },
  anyOf: {
    label: (c) => `one of: ${c.checks.map(checkLabel).join(' OR ')}`,
    test: (steps, c, record) => c.checks.some((inner) => runCheck(record, inner).pass),
  },
};

export function checkLabel(check) {
  const type = CHECK_TYPES[check.type];
  if (!type) throw new Error(`Unknown check type: ${check.type}`);
  return type.label(check) + stepLabel(check);
}

// { label, pass }. A step that the record doesn't have fails the check.
export function runCheck(record, check) {
  const type = CHECK_TYPES[check.type];
  if (!type) throw new Error(`Unknown check type: ${check.type}`);
  const steps = stepsFor(record, check);
  const pass = check.step && !steps.length ? false : Boolean(type.test(steps, check, record));
  return { label: checkLabel(check), pass };
}

export function runChecks(record, checks = []) {
  return checks.map((check) => runCheck(record, check));
}
