// Free tests. No Claude calls. Run: npm run test:unit
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PRODUCTS, STATUS, findProduct } from '../../shared/catalog.js';
import { MAX_RESULTS, fuzzyMatch, matchTier, rankProducts, searchProducts, similarity, withoutGenericWords } from '../../shared/search.js';

const names = (products) => products.map((product) => product.name);

// Results of the Week 1 Python search (tiny_agent.py _fuzzy_contains) on this catalog,
// made once with python3 and saved, so the port must match Python product for product.
const oracle = JSON.parse(readFileSync(new URL('./week1-search-oracle.json', import.meta.url), 'utf8'));

test('U3: Ironveil Cloud Guard is not in the catalog. 33 products. 6 are A (approved) for both buyers', () => {
  assert.equal(PRODUCTS.length, 33);
  assert.ok(!PRODUCTS.some((product) => product.name === 'Ironveil Cloud Guard'));
  const approvedForBoth = PRODUCTS.filter((p) => p.approval.Engineering === STATUS.APPROVED && p.approval.Finance === STATUS.APPROVED);
  assert.deepEqual(names(approvedForBoth), [
    'Lakeforge Data Platform', 'Talonix Platform', 'Gatekey Workforce Starter', 'Vaultline Business',
    'BucketShield Malware Scanning', 'Larkspur Linux 22.04 LTS',
  ]);
});

test('catalog: every product has a category and no link field', () => {
  for (const product of PRODUCTS) {
    assert.ok(product.category, `${product.name} has no category`);
    assert.equal(product.link, undefined);
  }
  assert.equal(findProduct('prod-jyxmvpxi').category, 'Monitoring agent for EC2');
  assert.equal(findProduct('prod-fhjizsnu').category, 'Monitoring agent for Kubernetes');
  assert.equal(findProduct('prod-aevxhksu').category, 'Server operating system');
});

test('difflib port: similarity matches Python SequenceMatcher.ratio', () => {
  // Values from Python: difflib.SequenceMatcher(None, a, b).ratio()
  assert.equal(similarity('watchtail', 'watchtial'), 0.8888888888888888);
  assert.equal(similarity('security', 'secuirty'), 0.875);
  assert.equal(similarity('abc', 'xyz'), 0);
});

test('Week 1 match: the JS port finds the same products as the Python search', () => {
  for (const [query, expected] of Object.entries(oracle)) {
    const found = PRODUCTS.filter((p) => fuzzyMatch(`${p.name} ${p.vendor} ${p.description}`.toLowerCase(), query));
    assert.deepEqual(names(found), expected, `query "${query}"`);
  }
});

test('U1: "VPN" returns Meshwire, Tunnelport Access Server (BYOL), Shalecrest UTM 9 (all description matches, catalog order)', () => {
  const result = searchProducts('VPN');
  assert.equal(result.total, 3);
  assert.equal(result.needsClarify, false);
  assert.deepEqual(names(result.shown), ['Meshwire', 'Tunnelport Access Server (BYOL)', 'Shalecrest UTM 9']);
  for (const product of result.shown) assert.equal(matchTier(product, 'VPN'), 4);
});

test('U1: ranking tiers with a made-up 4-product list (exact name, name contains, vendor, description, typo)', () => {
  const made = (id, name, vendor, description) => ({ product_id: id, name, vendor, description, category: 'x', approval: {} });
  const list = [
    made('d', 'Orbit Notes', 'Paperkite', 'Shared notes for a ledger team'), // description contains "ledger"
    made('c', 'Quillbox', 'Ledger Works', 'Writes invoices'), // vendor contains "ledger"
    made('b', 'Ledger Pro Cloud', 'Brightmoss', 'Accounting'), // name contains "ledger"
    made('a', 'Ledger', 'Brightmoss', 'Accounting'), // exact name
    made('e', 'Tallyhop', 'Brightmoss', 'Simple ledgr exports'), // typo-only ("ledgr")
  ];
  assert.deepEqual(rankProducts(list, 'ledger').map((p) => p.product_id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(list.map((p) => matchTier(p, 'Ledger')), [4, 3, 2, 1, 5]);
});

test('U1: ties keep catalog order', () => {
  // "watchtail": 5 products, all "name contains" (tier 2), catalog order.
  assert.deepEqual(names(searchProducts('watchtail').shown), [
    'Watchtail Enterprise', 'Watchtail Pro', 'Watchtail Agent', 'Watchtail Operator', 'Managed Watchtail Threat Detection',
  ]);
});

test('U2: "security" returns 9 matches, so it needs the clarifying question and shows no list', () => {
  const result = searchProducts('security');
  assert.equal(result.total, 9);
  assert.equal(result.needsClarify, true);
  assert.deepEqual(result.shown, []);
});

test('5 matches shows the list, 6 or more asks the question', () => {
  assert.equal(MAX_RESULTS, 5);
  assert.equal(searchProducts('watchtail').needsClarify, false);
});

test('no match: "Zentrova" finds 0 products (frame 20)', () => {
  const result = searchProducts('Zentrova');
  assert.equal(result.total, 0);
  assert.equal(result.needsClarify, false);
});

test('exact name search ranks the product first (frames 17, 18, 23)', () => {
  assert.deepEqual(names(searchProducts('Meshwire').shown), ['Meshwire']);
  assert.deepEqual(names(searchProducts('Lumora Image Large').shown), ['Lumora Image Large']);
  assert.deepEqual(names(searchProducts('Tunnelport Access Server').shown), ['Tunnelport Access Server (BYOL)']);
});

test('run B fix 8 (Lisa, Nov 17): generic words are removed from the query before ranking', () => {
  // "security tools" gives the same result as "security": 9 matches, so the frame 7 dialog.
  const tools = searchProducts('security tools');
  const security = searchProducts('security');
  assert.equal(tools.query, 'security');
  assert.equal(tools.total, 9);
  assert.equal(tools.needsClarify, true);
  assert.deepEqual(names(tools.matches), names(security.matches));
  // Whole words, any letter case, extra spaces removed.
  assert.equal(withoutGenericWords('  Security  TOOLS '), 'Security');
  assert.equal(withoutGenericWords('VPN software solution'), 'VPN');
  assert.equal(withoutGenericWords('toolbox'), 'toolbox');
  // No words left: the query stays as the buyer typed it.
  assert.equal(searchProducts('Software').query, 'Software');
  // Same results as before (the ranking rule does not change).
  for (const query of ['VPN', 'Meshwire', 'Tunnelport Access Server']) {
    const result = searchProducts(query);
    assert.equal(result.query, query);
    assert.deepEqual(names(result.matches), names(rankProducts(PRODUCTS, query)));
  }
});
