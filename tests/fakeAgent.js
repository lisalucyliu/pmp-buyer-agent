// FAKE AGENT for step 1 and for free tests. It never calls Claude.
//
// It answers the example messages in docs/demo2-spec.md with the spec's text, as plain text.
// Everything that code owns in the real agent comes from the real shared/ code here too:
// search and ranking, alternatives, frame 7 choices, request checks, contact details, the List rule (Q3)
// and the request prompt rule (Q6). Step 2 replaces this file with the real server function.
//
// Output: NDJSON events, the same shapes the real server function will send.
//   step       { id, status: 'loading' | 'success' | 'error', text, header }
//   text       { delta }                       Claude's text, streamed into the first bubble
//   stacked    { text, handOff }               A stacked text bubble (reason line, hand-off line)
//   products_loading {}                        8b: the List is coming
//   products   { ids, moreHref }               The List (code's order)
//   clarify    { query, choices }              Frame 7 dialog
//   contact    { email, slack }                Contact bubble (code found them, Claude never sees them)
//   note_ask   { productId }                   Fixed note and PO ask (Q5), asked once
//   card       { productId, note, poNumber }   The confirm card. Nothing else follows in this turn.
//   fixed      { key, productId }              A fixed line from shared/copy.js (frame 13 duplicate)
//   prompts    { alignment, editable, items }  Support prompts (code decides)
//   flags      { set }                         Conversation flags (alternatives shown)
//   subject    { productId }                   The product the conversation is about now
//   error      { errorType }
//   done       {}
import { PRODUCTS, experienceFor, findBuyer, findProduct, isApproved, statusFor } from '../shared/catalog.js';
import { findAlternatives } from '../shared/alternatives.js';
import { choiceAnswer } from '../shared/choiceAnswer.js';
import { clarifyChoices } from '../shared/clarify.js';
import { findContacts, hasContacts } from '../shared/contacts.js';
import { COPY, lines } from '../shared/copy.js';
import { ERROR_TYPE } from '../shared/errorTypes.js';
import { alternativesPromptShows, answerPromptItems, handOffLine, listForTurn, namedProducts, requestPromptProduct } from '../shared/answerProducts.js';
import { hasNote } from '../shared/productRequest.js';
import { CHECK, checkRequest } from '../shared/requestChecks.js';
import { searchProducts } from '../shared/search.js';

export const FAKE_NO_SCRIPT =
  'Step 1 fake agent: there is no script for this message. Try a message from the spec, for example "Do we have a VPN I can use?"';

// Messages the fake agent knows, by frame. The report and README list these for Lisa's review.
export const SCRIPTED_MESSAGES = [
  ['6', 'Do we have a VPN I can use?'],
  ['7', 'I need a security tool'],
  ['9 to 12', 'Request approval on the Meshwire page, then the support prompts'],
  ['11', 'Need this for the Q1 network migration. PO 4500012345'],
  ['13', 'Request QuarryDB Cloud (pay-as-you-go)'],
  ['17 (Sam)', 'Can I get Meshwire?'],
  ['18', 'I need Lumora Image Large.'],
  ['19', 'Can I get a refund for Watchtail Pro?'],
  ['20', 'Do we have Zentrova?'],
  ['23', 'Can you just buy Tunnelport Access Server for me?'],
  ['24', 'Just buy Meshwire for me.'],
  ['25', 'How much does Watchtail Pro cost?'],
  ['26', 'Is Watchtail Pro approved?'],
  ['27', "What's the difference between Watchtail Pro and Watchtail Enterprise?"],
];

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const joinNames = (names) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
const byExactName = (name) => PRODUCTS.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
const clean = (text) => String(text ?? '').trim().replace(/[‘’]/g, "'");

// Product names the text names, among the whole catalog (fake only: finds what the buyer is asking about).
function productsNamedIn(text) {
  return namedProducts(text, PRODUCTS);
}

function lastAssistantText(messages) {
  return [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';
}

class Turn {
  constructor(ctx) {
    this.ctx = ctx;
    this.events = [];
    this.searchResults = [];
    this.alternatives = null;
    this.alternativesSubject = null;
    this.text = '';
    this.handOff = false;
    this.stepCount = 0;
  }

  emit(event, delayMs = 0) {
    this.events.push({ event, delayMs });
  }

  search(query) {
    const id = `step-${(this.stepCount += 1)}`;
    this.emit({ type: 'step', id, status: 'loading', text: lines.searchLoading(query) });
    const result = searchProducts(query);
    this.emit(
      { type: 'step', id, status: 'success', text: lines.searchDone(result.total), header: lines.searchHeader(query) },
      this.ctx.stepDelayMs,
    );
    this.searchResults.push(...result.shown);
    return result;
  }

  checkAlternatives(subject) {
    const id = `step-${(this.stepCount += 1)}`;
    this.emit({ type: 'step', id, status: 'loading', text: lines.alternativesLoading(subject.name) });
    const result = findAlternatives(subject, this.ctx.experience.id);
    this.emit(
      { type: 'step', id, status: 'success', text: lines.alternativesDone(subject.category, result.total), header: lines.alternativesHeader(subject.name) },
      this.ctx.stepDelayMs,
    );
    this.alternatives = result;
    this.alternativesSubject = subject;
    this.emit({ type: 'flags', set: { alternativesShown: true } });
    this.emit({ type: 'subject', productId: subject.product_id });
    return result;
  }

  say(text) {
    this.text += (this.text ? ' ' : '') + text;
    const words = text.split(/(?<= )/);
    const chunk = 4;
    const prefix = this.textStarted ? ' ' : '';
    this.textStarted = true;
    for (let i = 0; i < words.length; i += chunk) {
      this.emit({ type: 'text', delta: (i === 0 ? prefix : '') + words.slice(i, i + chunk).join('') }, this.ctx.tokenDelayMs);
    }
  }

  stacked(text, { handOff = false } = {}) {
    this.emit({ type: 'stacked', text, handOff });
    if (handOff) this.handOff = true;
  }

  // Reason line (row 2). n approved products in the same category. Drafted from frame 9.
  reasonLine(result) {
    const job = lowerFirst(result.category);
    if (result.total === 1) return `1 approved product in your Private Marketplace is also used for ${job}.`;
    return `${result.total} approved products in your Private Marketplace are also used for ${job}.`;
  }

  list(products, moreHref = null) {
    if (!products.length) return;
    this.emit({ type: 'products_loading' });
    this.emit({ type: 'products', ids: products.map((p) => p.product_id), moreHref }, this.ctx.stepDelayMs);
  }

  // The List after the text: code's rule (Q3), not the script's choice.
  codeList() {
    const items = listForTurn({ text: this.text, searchResults: this.searchResults, alternatives: this.alternatives });
    this.list(items, this.alternatives?.moreHref ?? null);
  }

  handOffEnding() {
    return this.ctx.contactsYes ? 'contact your administrator.' : 'speak with your administrator.';
  }

  contactBubble() {
    if (!this.ctx.contactsYes) return;
    this.emit({ type: 'contact', ...findContacts(this.ctx.experience.branding_description) });
  }

  requestPrompt() {
    const product = requestPromptProduct({
      text: this.text,
      searchResults: this.searchResults,
      alternativesSubject: this.alternativesSubject,
      buyer: this.ctx.buyer,
      experience: this.ctx.experience,
      requests: this.ctx.requests,
      products: PRODUCTS,
      handOff: this.handOff,
    });
    if (product) {
      const showAlternatives = alternativesPromptShows({
        text: this.text,
        searchResults: this.searchResults,
        alternatives: this.alternatives,
        requestProduct: product,
        flags: this.ctx.flags,
        experience: this.ctx.experience,
      });
      this.emit({ type: 'prompts', alignment: 'vertical', editable: false, items: answerPromptItems(product, showAlternatives) });
    }
  }

  done() {
    this.emit({ type: 'done' });
    return this.events;
  }
}

// ---- Paths shared by several frames ----

// A product that isn't approved: alternatives first, then the request offer (decision 6), or the hand-off.
function notApprovedPath(turn, product, { prefix = '' } = {}) {
  const { experience } = turn.ctx;
  const status = statusFor(product, experience.id);
  const alternatives = turn.checkAlternatives(product);
  const first = `${prefix}${product.name} isn't approved for purchase in your Private Marketplace.`;
  if (alternatives.total === 0) {
    turn.say(`${first} No approved products in your Private Marketplace do the same job.`);
  } else {
    turn.say(first);
    turn.stacked(turn.reasonLine(alternatives));
  }
  turn.codeList();
  if (!experience.requests_enabled) {
    // Frame 17 (H1). Sam hears this line for a D product too (decision 1).
    turn.stacked(
      lines.handOffRequestsOff(product.name, turn.ctx.contactsYes),
      { handOff: true },
    );
    turn.contactBubble();
  } else if (status === 'D') {
    // Frame 18 (H2)
    turn.stacked(lines.handOffCantRequest(turn.ctx.contactsYes), { handOff: true });
    turn.contactBubble();
  } else {
    turn.requestPrompt();
  }
}

// The card, or the reason there is no card (decision 18).
function submitPath(turn, product, { note = '', poNumber = '' } = {}) {
  const { buyer, experience, requests } = turn.ctx;
  const check = checkRequest({ productId: product.product_id, buyer, experience, requests, products: PRODUCTS });
  turn.emit({ type: 'subject', productId: product.product_id });
  if (check.result === CHECK.OK) {
    // The note is required (Lisa, Nov 21): no note means the noteMissing line and no card, the same as runSubmit.
    if (!hasNote(note)) turn.emit({ type: 'fixed', key: 'noteMissing', productId: product.product_id });
    else turn.emit({ type: 'card', productId: product.product_id, note, poNumber }, turn.ctx.stepDelayMs);
    return;
  }
  if (check.result === CHECK.DUPLICATE) {
    turn.emit({ type: 'fixed', key: 'duplicate', productId: product.product_id });
    return;
  }
  if (check.result === CHECK.APPROVED) {
    turn.say(`${product.name} is approved for purchase in your Private Marketplace.`);
    turn.searchResults.push(product);
    turn.codeList();
    return;
  }
  if (check.result === CHECK.REQUESTS_OFF) {
    turn.say(`${product.name} isn't approved for purchase in your Private Marketplace.`);
    turn.stacked(lines.handOffRequestsOff(product.name, turn.ctx.contactsYes), { handOff: true });
    turn.contactBubble();
    return;
  }
  turn.say(`${product.name} isn't approved for purchase in your Private Marketplace.`);
  turn.stacked(lines.handOffCantRequest(turn.ctx.contactsYes), { handOff: true });
  turn.contactBubble();
}

// "I want X", "Can I get X?", "Is X approved?"
function approvalPath(turn, query, { prefix = '' } = {}) {
  const result = turn.search(query);
  if (result.total === 0) return noMatchPath(turn, query);
  if (result.needsClarify) return clarifyPath(turn, result);
  const exact = byExactName(query) ?? (result.shown.length === 1 ? result.shown[0] : null);
  if (!exact) return searchSummary(turn, result, { prefix });
  if (isApproved(exact, turn.ctx.experience.id)) {
    turn.say(`${prefix}${exact.name} is approved for purchase in your Private Marketplace.`);
    turn.codeList();
    return;
  }
  notApprovedPath(turn, exact, { prefix });
}

function searchSummary(turn, result, { prefix = '' } = {}) {
  const approved = result.shown.filter((p) => isApproved(p, turn.ctx.experience.id)).map((p) => p.name);
  const notApproved = result.shown.filter((p) => !isApproved(p, turn.ctx.experience.id)).map((p) => p.name);
  const parts = [`${prefix}I found ${result.total} ${result.total === 1 ? 'product' : 'products'} that match "${result.query}".`];
  if (approved.length) parts.push(`${joinNames(approved)} ${approved.length === 1 ? 'is' : 'are'} approved for purchase.`);
  if (notApproved.length) parts.push(`${joinNames(notApproved)} ${notApproved.length === 1 ? "isn't" : "aren't"} approved.`);
  turn.say(parts.join(' '));
  turn.codeList();
  turn.requestPrompt();
}

function clarifyPath(turn, result) {
  turn.say(`${result.total} products match "${result.query}". What do you need it for?`);
  turn.emit({ type: 'clarify', query: result.query, choices: clarifyChoices(result.query, result.matches) });
}

function noMatchPath(turn, query) {
  turn.say(`I didn't find a product named "${query}". Check the spelling, or tell me what you need it for, and I can look for an approved product that does the same job.`);
  turn.emit({ type: 'prompts', alignment: 'horizontal', editable: true, items: [{ id: 'find-approved', text: COPY.promptFindApproved }] });
}

// Frame 7 answer: the same code as the real server (shared/choiceAnswer.js).
function choicePath(turn, choice) {
  const id = `step-${(turn.stepCount += 1)}`;
  const answer = choiceAnswer(choice, turn.ctx.experience.id);
  turn.emit({ type: 'step', id, status: 'loading', text: answer.stepLoading });
  turn.emit({ type: 'step', id, status: 'success', text: answer.stepDone, header: answer.stepHeader }, turn.ctx.stepDelayMs);
  turn.searchResults.push(...answer.products);
  turn.say(answer.text);
  turn.codeList();
  turn.requestPrompt();
}

// Frame 19 (H3): one first sentence, then the hand-off line only.
const CANT_ANSWER = [
  [/refund/, () => "I can't help with refunds."],
  [/contract/, () => "I can't help with contract terms."],
  [/private marketplace settings|change my private marketplace/, () => "I can't help with Private Marketplace settings."],
  [/why isn't (.+?) approved/, (m) => `I don't have more details about ${byExactName(m[1])?.name ?? m[1]}'s approval.`],
  [/coworker in .+ has (.+?)\.?$/, (m, turn) => {
    const product = byExactName(m[1]);
    const name = product?.name ?? m[1];
    const status = product && isApproved(product, turn.ctx.experience.id) ? 'is approved' : "isn't approved";
    return `Approvals can be different for other teams. In your Private Marketplace, ${name} ${status}.`;
  }],
];

// Replies to the note ask that mean "no note".
const NO_NOTE = /^(no|no note|none|skip|just send it|continue without a note)[.!]?$/i;

function parseNote(text) {
  const po = text.match(/\bPO(?:\s*(?:number|#))?\s*:?\s*([A-Za-z0-9-]{4,})/i);
  const poNumber = po ? po[1] : '';
  let note = po ? text.replace(po[0], '') : text;
  note = note.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim().replace(/[.,]\s*$/, '.');
  if (note && !/[.!?]$/.test(note)) note += '.';
  return { note, poNumber };
}

// ---- Entry point ----

export function fakeAgentEvents(body, { stepDelayMs = 0, tokenDelayMs = 0 } = {}) {
  const buyer = findBuyer(body.buyerId) ?? findBuyer('riley');
  const experience = experienceFor(buyer);
  const requests = (body.openRequests ?? []).map((productId) => ({ account_id: buyer.account_id, product_id: productId, status: 'Pending' }));
  const ctx = {
    buyer, experience, requests, stepDelayMs, tokenDelayMs,
    contactsYes: hasContacts(experience.branding_description),
    flags: body.flags ?? {},
  };
  const turn = new Turn(ctx);
  const messages = body.messages ?? [];
  const message = clean([...messages].reverse().find((m) => m.role === 'user')?.content);
  const lower = message.toLowerCase();
  const subject = body.subjectProductId ? findProduct(body.subjectProductId) : null;

  // Frame 7 answer
  if (body.choice) {
    choicePath(turn, body.choice);
    return turn.done();
  }

  // Frame 5 and 12 support prompt
  if (lower === COPY.showAlternatives.toLowerCase()) {
    const product = subject ?? productsNamedIn(lastAssistantText(messages))[0];
    if (!product) {
      turn.say(FAKE_NO_SCRIPT);
      return turn.done();
    }
    const result = turn.checkAlternatives(product);
    if (result.total === 0) turn.say(`No approved products in your Private Marketplace do the same job as ${product.name}.`);
    else turn.say(turn.reasonLine(result));
    turn.codeList();
    if (!experience.requests_enabled) {
      turn.stacked(lines.handOffRequestsOff(product.name, turn.ctx.contactsYes), { handOff: true });
      turn.contactBubble();
    } else {
      turn.requestPrompt();
    }
    return turn.done();
  }

  // "Request <product>" support prompt or typed ask
  const requestMatch = message.match(/^(?:request|send a request for)\s+(.+?)\.?$/i);
  if (requestMatch && byExactName(requestMatch[1])) {
    const product = byExactName(requestMatch[1]);
    if (!ctx.flags.noteAsked) {
      const check = checkRequest({ productId: product.product_id, buyer, experience, requests, products: PRODUCTS });
      if (check.result === CHECK.OK) {
        turn.emit({ type: 'subject', productId: product.product_id });
        turn.emit({ type: 'note_ask', productId: product.product_id });
        return turn.done();
      }
    }
    submitPath(turn, product);
    return turn.done();
  }

  // The answer to the note ask (or to the noteMissing line). A reply that only asks to skip the note, or
  // only gives a PO number, is not a note (Lisa, Nov 21).
  const lastAssistant = lastAssistantText(messages);
  if (subject && (lastAssistant.endsWith(COPY.noteAsk) || lastAssistant.endsWith(COPY.noteMissing))) {
    if (NO_NOTE.test(message.trim())) submitPath(turn, subject);
    else submitPath(turn, subject, parseNote(message));
    return turn.done();
  }

  // Frame 19 (H3)
  for (const [pattern, firstSentence] of CANT_ANSWER) {
    const match = lower.match(pattern);
    if (match) {
      const original = message.match(new RegExp(pattern.source, 'i'));
      turn.say(`${firstSentence(original ?? match, turn)} ${ctx.contactsYes ? 'Contact' : 'Speak with'} your administrator.`);
      turn.handOff = true;
      turn.contactBubble();
      return turn.done();
    }
  }

  // Frame 27, 5d: too big
  if (/\b(table|report|compare all)\b/.test(lower)) {
    turn.say('I can only give short answers about products. Each product page has more details.');
    if (/security/.test(lower)) {
      const result = turn.search('security');
      turn.emit({ type: 'clarify', query: 'security', choices: clarifyChoices('security', result.matches) });
    } else {
      turn.searchResults.push(...productsNamedIn(lastAssistant).slice(0, 5));
      turn.text += ` ${lastAssistant}`;
      turn.codeList();
    }
    return turn.done();
  }

  // Frame 6
  if (/\bvpn\b/.test(lower)) {
    searchSummary(turn, turn.search('VPN'));
    return turn.done();
  }

  // Frame 7
  if (/\bsecurity tool\b/.test(lower)) {
    clarifyPath(turn, turn.search('security'));
    return turn.done();
  }

  // Frames 23 and 24 (P1, P2): "just buy it"
  const buy = message.match(/(?:just buy|buy)\s+(.+?)(?:\s+for me)?[?.!]*$/i);
  if (buy) {
    const query = buy[1];
    const result = turn.search(query);
    const product = byExactName(query) ?? (result.shown.length === 1 ? result.shown[0] : null);
    if (!product) {
      turn.say("I can't buy products for you.");
      return turn.done();
    }
    if (isApproved(product, experience.id)) {
      turn.say(`I can't buy products for you. ${product.name} is approved for purchase in your Private Marketplace. To buy it, choose View purchase options on its product page.`);
      turn.codeList();
    } else {
      notApprovedPath(turn, product, { prefix: "I can't buy products for you. " });
    }
    return turn.done();
  }

  // Frame 25 (P3): price
  const price = message.match(/how much (?:does|is)\s+(.+?)(?:\s+cost)?\?*$/i) ?? message.match(/price (?:of|for)\s+(.+?)\?*$/i);
  if (price) {
    const result = turn.search(price[1]);
    const product = byExactName(price[1]) ?? result.shown[0];
    if (product) {
      const approved = isApproved(product, experience.id);
      turn.say(`I can't give you prices. You can find pricing for ${product.name} on its product page.${approved ? '' : ` ${product.name} isn't approved for purchase in your Private Marketplace.`}`);
      turn.codeList();
      if (!approved && !experience.requests_enabled) {
        turn.stacked(lines.handOffRequestsOff(product.name, turn.ctx.contactsYes), { handOff: true });
        turn.contactBubble();
      } else if (!approved) {
        turn.requestPrompt();
      }
    } else {
      turn.say("I can't give you prices.");
    }
    return turn.done();
  }

  // Frame 27, 5b: a simple comparison
  const compare = message.match(/difference between\s+(.+?)\s+and\s+(.+?)\?*$/i);
  if (compare && byExactName(compare[1]) && byExactName(compare[2])) {
    const [a, b] = [byExactName(compare[1]), byExactName(compare[2])];
    turn.search(a.vendor === b.vendor ? a.vendor : a.name);
    const aOk = isApproved(a, experience.id);
    const bOk = isApproved(b, experience.id);
    let approval;
    if (aOk && bOk) approval = 'Both are approved for purchase in your Private Marketplace.';
    else if (aOk) approval = `${a.name} is approved for purchase in your Private Marketplace, and ${b.name} isn't.`;
    else if (bOk) approval = `${b.name} is approved for purchase in your Private Marketplace, and ${a.name} isn't.`;
    else approval = "Neither is approved for purchase in your Private Marketplace.";
    if (a.name === 'Watchtail Pro' && b.name === 'Watchtail Enterprise') {
      turn.say(`Watchtail Pro is for smaller teams, and Watchtail Enterprise is for large companies. Both have metrics, logs, traces and database monitoring. ${approval}`);
    } else {
      turn.say(`${a.name}: ${lowerFirst(a.description)}. ${b.name}: ${lowerFirst(b.description)}. ${approval}`);
    }
    turn.codeList();
    if (!experience.requests_enabled && !(aOk && bOk)) {
      // The same hand-off bubble as the server: 1 product, the spec text; 2 or more, 1 combined bubble.
      const notApprovedProducts = [a, b].filter((p) => !isApproved(p, experience.id));
      turn.stacked(handOffLine(notApprovedProducts, experience), { handOff: true });
      turn.contactBubble();
    } else {
      turn.requestPrompt();
    }
    return turn.done();
  }

  // Frame 27, 5a and 5c
  const what = message.match(/what does\s+(.+?)\s+do\?*$/i);
  const feature = message.match(/does\s+(.+?)\s+(?:support|have|work with)\s+.+\?*$/i);
  if ((what && byExactName(what[1])) || (feature && byExactName(feature[1]))) {
    const product = byExactName((what ?? feature)[1]);
    turn.search(product.name);
    const approvedText = isApproved(product, experience.id)
      ? "It's approved for purchase in your Private Marketplace."
      : "It isn't approved for purchase in your Private Marketplace.";
    if (what && product.name === 'Watchtail Pro') {
      turn.say(`Watchtail Pro is an observability and security platform for smaller teams, with metrics, logs, traces and database monitoring. ${approvedText}`);
    } else if (what) {
      turn.say(`${product.name} is ${lowerFirst(product.description).replace(/^([a-z])/, (c) => (/[aeiou]/.test(c) ? `an ${c}` : `a ${c}`))}. ${approvedText}`);
    } else {
      turn.say(`I don't have details about that. ${product.name}'s product page has more information.`);
    }
    turn.codeList();
    turn.requestPrompt();
    return turn.done();
  }

  // "Find an approved product for <what you need>" (frames 4, 20)
  const find = message.match(/find an approved product for\s+(.+?)\.?$/i);
  if (find && !find[1].includes('<')) {
    const result = turn.search(find[1]);
    if (result.total === 0) noMatchPath(turn, find[1]);
    else if (result.needsClarify) clarifyPath(turn, result);
    else searchSummary(turn, result);
    return turn.done();
  }

  // Frame 20 and the approval paths: "Do we have X?", "Can I get X?", "I need X.", "Is X approved?"
  const ask = message.match(/^(?:do we have|can i get|i need|i want|is)\s+(.+?)(?:\s+approved(?: for purchase)?)?[?.!]*$/i);
  if (ask && !ask[1].includes('<')) {
    approvalPath(turn, ask[1]);
    return turn.done();
  }

  // Any message that names a product
  const named = productsNamedIn(message);
  if (named.length === 1) {
    approvalPath(turn, named[0].name);
    return turn.done();
  }

  turn.say(FAKE_NO_SCRIPT);
  return turn.done();
}

// Errors for frame 21, chosen with ?fakeError= on the page URL (dev and tests only).
export function fakeErrorEvents(errorType, body, options) {
  const events = [];
  const searching = { type: 'step', id: 'step-1', status: 'loading', text: lines.searchLoading('VPN') };
  if (errorType === ERROR_TYPE.E1A || errorType === ERROR_TYPE.E1B) {
    events.push({ event: searching, delayMs: 0 });
    events.push({ event: { type: 'step', id: 'step-1', status: 'error', text: COPY.errorSearchStep }, delayMs: options.stepDelayMs });
    events.push({ event: { type: 'error', errorType }, delayMs: 0 });
    return events;
  }
  if (errorType === ERROR_TYPE.E2) {
    // Text starts, then the stream ends with no "done".
    const normal = fakeAgentEvents(body, options).filter(({ event }) => event.type !== 'done');
    const firstText = normal.findIndex(({ event }) => event.type === 'text');
    return firstText === -1 ? normal : normal.slice(0, firstText + 2);
  }
  return null;
}
