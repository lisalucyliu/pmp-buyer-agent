// Which products get a List item after a response, and when a "Request <product>" support prompt shows.
// Code decides both. Claude doesn't choose them (build plan section 2, step 5).
import { canRequest } from './requestChecks.js';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Q3 (Lisa's answers Nov 16, option A): code finds product names in Claude's final text, only among
// this turn's tool results. It looks for the FULL product name, case-insensitive, as whole words.
// A short name (for example "Tunnelport" for "Tunnelport Access Server (BYOL)") doesn't match.
// Returns the products in the order of the candidates (ranked tool-result order).
export function namedProducts(text, candidates) {
  const found = new Set();
  let remaining = String(text ?? '');
  // Longest names first, so a name inside a longer name can't match twice.
  const byLength = [...candidates].sort((a, b) => b.name.length - a.name.length);
  for (const product of byLength) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(product.name)}(?![A-Za-z0-9])`, 'i');
    if (pattern.test(remaining)) {
      found.add(product.product_id);
      remaining = remaining.replace(pattern, '$1 ');
    }
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
