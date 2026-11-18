// Product search: the Week 1 match (ported from pmp-tiny-agent/tiny_agent.py) and the ranking rule.
//
// Match (Week 1): a product matches when the search text is inside "name vendor description",
// or when every word of the search text is a word of that text, or close to one (a small typo).
// "Close" uses the same test as Python's difflib.get_close_matches with cutoff 0.8.
//
// Ranking (decision 19, decided Nov 15; Lisa's answers Nov 16, Q8):
//   1. exact product name
//   2. product name contains the search text
//   3. vendor name contains the search text
//   4. description contains the search text (or every word is found as a whole word, with no typo)
//   5. typo-only match
// Ties keep catalog order. Code shows at most 5. More than 5 matches: the agent asks a
// clarifying question (frame 7) and shows no list.
import { PRODUCTS } from './catalog.js';

export const MAX_RESULTS = 5;
export const TYPO_CUTOFF = 0.8;

export function normalize(text) {
  return String(text ?? '').trim().toLowerCase();
}

// ---- Port of difflib.SequenceMatcher(None, a, b).ratio() for short strings (no junk) ----

function findLongestMatch(a, b, b2j, alo, ahi, blo, bhi) {
  let bestI = alo;
  let bestJ = blo;
  let bestSize = 0;
  let j2len = new Map();
  for (let i = alo; i < ahi; i += 1) {
    const next = new Map();
    for (const j of b2j.get(a[i]) ?? []) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (j2len.get(j - 1) ?? 0) + 1;
      next.set(j, k);
      if (k > bestSize) {
        bestI = i - k + 1;
        bestJ = j - k + 1;
        bestSize = k;
      }
    }
    j2len = next;
  }
  return [bestI, bestJ, bestSize];
}

function matchingCharacters(a, b) {
  const b2j = new Map();
  [...b].forEach((char, j) => {
    if (!b2j.has(char)) b2j.set(char, []);
    b2j.get(char).push(j);
  });
  let total = 0;
  const queue = [[0, a.length, 0, b.length]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop();
    const [i, j, k] = findLongestMatch(a, b, b2j, alo, ahi, blo, bhi);
    if (k === 0) continue;
    total += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return total;
}

export function similarity(a, b) {
  const length = a.length + b.length;
  return length === 0 ? 1 : (2 * matchingCharacters(a, b)) / length;
}

// difflib.get_close_matches(word, words, n=1, cutoff): seq1 is the candidate, seq2 is the word.
function hasCloseWord(word, words) {
  return words.some((candidate) => similarity(candidate, word) >= TYPO_CUTOFF);
}

function haystackFor(product) {
  return normalize(`${product.name} ${product.vendor} ${product.description}`);
}

// Week 1 _fuzzy_contains. Returns 'exact' (no typo needed), 'typo', or null (no match).
export function fuzzyMatch(haystack, needle) {
  if (haystack.includes(needle)) return 'exact';
  const haystackWords = haystack.split(/\s+/).filter(Boolean);
  let usedTypo = false;
  for (const word of needle.split(/\s+/).filter(Boolean)) {
    if (haystackWords.includes(word)) continue;
    if (word.length < 3) return null;
    if (!hasCloseWord(word, haystackWords)) return null;
    usedTypo = true;
  }
  return usedTypo ? 'typo' : 'exact';
}

// Ranking tier 1 to 5, or 0 when the product doesn't match.
export function matchTier(product, query) {
  const needle = normalize(query);
  if (!needle) return 0;
  const match = fuzzyMatch(haystackFor(product), needle);
  if (!match) return 0;
  const name = normalize(product.name);
  if (name === needle) return 1;
  if (name.includes(needle)) return 2;
  if (normalize(product.vendor).includes(needle)) return 3;
  if (match === 'exact') return 4;
  return 5;
}

// Ranks products by tier. Ties keep the order of the input list (catalog order).
export function rankProducts(products, query) {
  return products
    .map((product, index) => ({ product, index, tier: matchTier(product, query) }))
    .filter((entry) => entry.tier > 0)
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map((entry) => entry.product);
}

// Run B fix 8 (Lisa, Nov 17), from run-b2 B5: "security tools" found 0 products. These generic words
// are removed from the query before ranking (whole words, any letter case). If no words are left,
// the query stays as the buyer typed it.
export const GENERIC_WORDS = ['tool', 'tools', 'product', 'products', 'software', 'app', 'apps', 'solution', 'solutions'];
const GENERIC_PATTERN = new RegExp(`\\b(?:${GENERIC_WORDS.join('|')})\\b`, 'gi');

export function withoutGenericWords(query) {
  const shorter = String(query ?? '').replace(GENERIC_PATTERN, ' ').replace(/\s+/g, ' ').trim();
  return shorter || query;
}

// The search the search_products tool runs.
// query: the query with generic words removed (fix 8). The step line and the tool text use it.
// shown: the ranked products to list (empty when more than 5 matched).
// needsClarify: true when more than 5 matched (frame 7).
export function searchProducts(typedQuery, products = PRODUCTS) {
  const query = withoutGenericWords(typedQuery);
  const matches = rankProducts(products, query);
  const needsClarify = matches.length > MAX_RESULTS;
  return {
    query,
    matches,
    total: matches.length,
    needsClarify,
    shown: needsClarify ? [] : matches,
  };
}
