// Which products get a List item after a response, and when a "Request <product>" support prompt shows.
// Code decides both. Claude doesn't choose them (build plan section 2, step 5).
import { STATUS, statusFor } from './catalog.js';
import { hasContacts } from './contacts.js';
import { lines } from './copy.js';
import { canRequest } from './requestChecks.js';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordPattern(words) {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(words)}(?![A-Za-z0-9])`, 'i');
}

// True when the text has the word (whole word, any case for the other letters) with a capital first letter.
function hasCapitalized(text, word) {
  const pattern = new RegExp(wordPattern(word).source, 'gi');
  for (const match of text.matchAll(pattern)) {
    const first = match[0].slice(match[1].length)[0];
    if (first && first === first.toUpperCase() && first !== first.toLowerCase()) return true;
  }
  return false;
}

function firstWord(name) {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

// Q3 (Lisa's answers Nov 16, option A, then option B in the step 1 report answers): code finds product
// names in Claude's final text, only among this turn's tool results. Case-insensitive, whole words.
// 1. The FULL product name matches.
// 2. A short name matches too, when it starts with a capital letter in Claude's text, and exactly 1
//    product in this turn's results starts with that word (Lisa's answer Nov 16, step 1 fixes report,
//    item 9). "Tunnelport" finds Tunnelport Access Server (BYOL). "a managed service" doesn't find
//    Managed Watchtail Threat Detection. "Watchtail" finds nothing when more than 1 result starts
//    with "Watchtail".
// Returns the products in the order of the candidates (ranked tool-result order).
export function namedProducts(text, candidates) {
  const found = new Set();
  let remaining = String(text ?? '');
  // Longest names first, so a name inside a longer name can't match twice.
  const byLength = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const product of byLength) {
    const pattern = wordPattern(product.name);
    if (pattern.test(remaining)) {
      found.add(product.product_id);
      remaining = remaining.replace(new RegExp(pattern.source, 'gi'), '$1 ');
    }
  }
  // Short names: the first word of a product name, when no other result starts with that word.
  const unique = candidates.filter((product, i) => candidates.findIndex((p) => p.product_id === product.product_id) === i);
  for (const product of unique) {
    if (found.has(product.product_id)) continue;
    const word = firstWord(product.name);
    const sameStart = unique.filter((p) => firstWord(p.name) === word);
    if (sameStart.length === 1 && hasCapitalized(remaining, word)) found.add(product.product_id);
  }
  return candidates.filter((product) => found.has(product.product_id));
}

// The List for a turn.
// - A turn that checked alternatives lists the alternatives (code's ranked top 5). The asked product
//   gets no List item (frames 9, 17, 18, 24).
// - Any other turn lists the products the text names, among this turn's search results (Q3).
export function listForTurn({ text, searchResults = [], alternatives = null }) {
  if (alternatives) return alternatives.items;
  const unique = [];
  for (const product of searchResults) {
    if (!unique.some((item) => item.product_id === product.product_id)) unique.push(product);
  }
  return namedProducts(text, unique);
}

// Q6 (option A): a "Request <product>" prompt shows only when exactly 1 product in the answer can be
// requested. "In the answer" = the products the text names, plus the asked product of an alternatives
// check (frame 9 names Meshwire only in the step line).
export function requestPromptProduct({ text, searchResults = [], alternativesSubject = null, buyer, experience, requests, products, handOff = false }) {
  if (handOff) return null; // No support prompts after a hand-off (row 5).
  const inAnswer = namedProducts(text, searchResults);
  if (alternativesSubject && !inAnswer.some((p) => p.product_id === alternativesSubject.product_id)) {
    inAnswer.push(alternativesSubject);
  }
  const requestable = inAnswer.filter((product) =>
    canRequest({ productId: product.product_id, buyer, experience, requests, products }));
  return requestable.length === 1 ? requestable[0] : null;
}

// Products that get a code-written hand-off bubble after Claude's text (Lisa's answers, Nov 16, step 2
// part 1 report, Q1). The products the answer is about: the asked product of an alternatives check, a
// product submit_request couldn't send, and the products the text names among this turn's results (Q3).
//   Requests off: each of them that isn't approved gets the frame 17 line.
//   Requests on: each D (declined and blocked) product gets the frame 18 line.
// The bubble text: handOffLine below.
export function handOffProducts({ text, searchResults = [], alternativesSubject = null, notSent = [], experience }) {
  const candidates = [];
  const add = (product) => {
    if (product && !candidates.some((p) => p.product_id === product.product_id)) candidates.push(product);
  };
  add(alternativesSubject);
  notSent.forEach(add);
  namedProducts(text, searchResults).forEach(add);
  return candidates.filter((product) => {
    const status = statusFor(product, experience.id);
    if (!experience.requests_enabled) return status !== STATUS.APPROVED;
    return status === STATUS.DECLINED_BLOCKED;
  });
}

// The hand-off bubble text for those products, or null. 1 product: the spec text. 2 or more: 1 combined
// bubble (Lisa's answers, Nov 16, part 1b report). "contact" when the Private Marketplace has contact details.
export function handOffLine(products, experience) {
  if (!products.length) return null;
  const contactsYes = hasContacts(experience.branding_description);
  if (!experience.requests_enabled) {
    return products.length === 1 ? lines.handOffRequestsOff(products[0].name, contactsYes) : lines.handOffRequestsOffMany(contactsYes);
  }
  return products.length === 1 ? lines.handOffCantRequest(contactsYes) : lines.handOffCantRequestMany(contactsYes);
}
