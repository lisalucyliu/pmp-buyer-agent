// Free tests. No Claude calls. Run: npm run test:unit
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { BUYERS, EXPERIENCES, PRODUCTS, experienceFor, findBuyer, findProduct } from '../../shared/catalog.js';
import { findAlternatives } from '../../shared/alternatives.js';
import { clarifyChoices, productsForChoice } from '../../shared/clarify.js';
import { findContacts, hasContacts } from '../../shared/contacts.js';
import { COPY, lines } from '../../shared/copy.js';
import { RECORD_FIELDS, createProductRequest, formatRequestDate, openRequestFor } from '../../shared/productRequest.js';
import { discoverRoute, productIdForRoute, productRoute, requestFormRoute } from '../../shared/productRoutes.js';
import { CHECK, checkRequest } from '../../shared/requestChecks.js';
import { listForTurn, namedProducts, requestPromptProduct } from '../../shared/answerProducts.js';
import { resolveSubmit } from '../../shared/submitRequest.js';
import { searchProducts } from '../../shared/search.js';

const names = (products) => products.map((product) => product.name);
const byName = (name) => PRODUCTS.find((product) => product.name === name);
const riley = findBuyer('riley');
const sam = findBuyer('sam');
const engineering = experienceFor(riley);
const finance = experienceFor(sam);
const sampleRequests = JSON.parse(readFileSync(new URL('../../data/sampleRequests.json', import.meta.url), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

// ---- Data ----

test('buyers and experiences: Riley is Engineering with requests on, Sam is Finance with requests off', () => {
  assert.equal(BUYERS.length, 2);
  assert.equal(engineering.branding_name, 'Initech Engineering Marketplace');
  assert.equal(engineering.requests_enabled, true);
  assert.equal(finance.branding_name, 'Initech Finance Marketplace');
  assert.equal(finance.requests_enabled, false);
  assert.ok(!('name' in EXPERIENCES[0]), 'experience name is in experience_name (admin only)');
});

test('sample rows: QuarryDB Cloud (pay-as-you-go) Pending Nov 10, 2026, 10:42 and Bastion NGFW VM Declined Oct 27, 2026, 15:08', () => {
  assert.deepEqual(sampleRequests.map((r) => [findProduct(r.product_id).name, r.status, formatRequestDate(r.date)]), [
    ['QuarryDB Cloud (pay-as-you-go)', 'Pending', 'Nov 10, 2026, 10:42'],
    ['Bastion NGFW VM', 'Declined', 'Oct 27, 2026, 15:08'],
  ]);
  for (const r of sampleRequests) assert.equal(findProduct(r.product_id).approval.Engineering, 'N');
});

test('no example.com link in any data file the app or Claude uses', () => {
  for (const file of readdirSync(new URL('../../data/', import.meta.url))) {
    const text = readFileSync(new URL(`../../data/${file}`, import.meta.url), 'utf8');
    assert.ok(!text.includes('example.com'), `${file} has an example.com link`);
    assert.ok(!/https?:\/\//.test(text), `${file} has a URL`);
  }
});

// ---- Product routes ----

test('product routes: each product_id has one unique console route, no external URL', () => {
  const routes = PRODUCTS.map((p) => productRoute(p.product_id));
  assert.equal(new Set(routes).size, 33);
  for (const route of routes) assert.match(route, /^\/products\/[a-z0-9-]+$/);
  assert.equal(productRoute('prod-rqccxbpo'), '/products/meshwire');
  assert.equal(productIdForRoute('/products/meshwire'), 'prod-rqccxbpo');
  assert.throws(() => productRoute('prod-nothing'));
  assert.equal(discoverRoute({ approvedOnly: true }), '/discover?approved=true');
  assert.equal(discoverRoute({ approvedOnly: true, category: 'Network firewall' }), '/discover?approved=true&category=Network+firewall');
  assert.equal(requestFormRoute('prod-rqccxbpo'), '/request-form?product=prod-rqccxbpo');
});

// ---- Alternatives ----

test('alternatives, frame 9 (Riley, Meshwire): Remote network access (VPN), 1 found, Tunnelport Access Server (BYOL)', () => {
  const result = findAlternatives(byName('Meshwire'), 'Engineering');
  assert.equal(result.category, 'Remote network access (VPN)');
  assert.deepEqual(names(result.items), ['Tunnelport Access Server (BYOL)']);
  assert.equal(result.more, false);
});

test('alternatives, frames 10, 17, 18: 0 found', () => {
  assert.equal(findAlternatives(byName('Auditlane'), 'Engineering').total, 0);
  assert.equal(findAlternatives(byName('Meshwire'), 'Finance').total, 0);
  assert.equal(findAlternatives(byName('Lumora Image Large'), 'Engineering').total, 0);
});

test('alternatives: the new results from the category list', () => {
  assert.deepEqual(names(findAlternatives(byName('Watchtail Enterprise'), 'Engineering').items), ['Watchtail Pro']);
  assert.deepEqual(names(findAlternatives(byName('Ironveil Horizon'), 'Engineering').items), ['Talonix Platform']);
  assert.deepEqual(names(findAlternatives(byName('Cardinal Enterprise Linux 9'), 'Engineering').items), ['Larkspur Linux 22.04 LTS']);
  // Changed Nov 16: Agent and Operator are now 2 categories, so they aren't alternatives for each other.
  assert.deepEqual(names(findAlternatives(byName('Watchtail Operator'), 'Engineering').items), []);
  // Paneway is "Server operating system", so it doesn't get Larkspur Linux.
  assert.deepEqual(names(findAlternatives(byName('Paneway Server 2022 Base'), 'Engineering').items), []);
});

test('alternatives: more than 5 shows the top 5 and a Discover link with the Approved filter and the category', () => {
  const made = Array.from({ length: 7 }, (_, i) => ({
    product_id: `p${i}`, name: `Tool ${i}`, vendor: 'V', description: 'd', category: 'Same job', approval: { Engineering: i === 0 ? 'N' : 'A' },
  }));
  const result = findAlternatives(made[0], 'Engineering', made);
  assert.equal(result.total, 6);
  assert.deepEqual(result.items.map((p) => p.product_id), ['p1', 'p2', 'p3', 'p4', 'p5']);
  assert.equal(result.more, true);
  assert.equal(result.moreHref, '/discover?approved=true&category=Same+job');
});

// ---- Frame 7 choices ----

test('frame 7: "security" gets the 4 fixed choices in the spec order', () => {
  const choices = clarifyChoices('security', searchProducts('security').matches);
  assert.deepEqual(choices.map((c) => c.label), [
    'Threat detection and response', 'Firewall and VPN', 'Compliance automation', 'Server and workload protection',
  ]);
});

test('frame 7: a choice shows ALL products in its categories (catalog order until Lisa decides)', () => {
  const [threat, firewall, compliance, server] = clarifyChoices('Security', []);
  assert.deepEqual(names(productsForChoice(firewall)), ['Meshwire', 'Tunnelport Access Server (BYOL)', 'Bastion NGFW VM', 'Shalecrest UTM 9']);
  assert.deepEqual(names(productsForChoice(threat)), [
    'Managed Watchtail Threat Detection', 'Ironveil Horizon', 'Talonix Platform', 'Holdfast Incident Response Retainer',
  ]);
  assert.deepEqual(names(productsForChoice(compliance)), ['Auditlane']);
  assert.deepEqual(names(productsForChoice(server)), ['Ironveil Workload Security']);
});

test('frame 7: other searches make up to 4 choices from the match categories, most matches first, then catalog order', () => {
  const made = (name, category) => ({ product_id: name, name, vendor: 'V', description: 'd', category, approval: {} });
  const catalog = [made('a', 'Cat A'), made('b', 'Cat B'), made('c', 'Cat B'), made('d', 'Cat C'), made('e', 'Cat D'), made('f', 'Cat E'), made('g', 'Cat C')];
  const choices = clarifyChoices('tools', catalog, catalog);
  assert.deepEqual(choices.map((c) => c.label), ['Cat B', 'Cat C', 'Cat A', 'Cat D']);
  assert.deepEqual(choices[0].categories, ['Cat B']);
});

test('frame 7: with the current catalog no choice result has more than 5 products', () => {
  const categories = new Set(PRODUCTS.map((p) => p.category));
  for (const category of categories) assert.ok(productsForChoice({ categories: [category] }).length <= 5, category);
  for (const choice of clarifyChoices('security', [])) assert.ok(productsForChoice(choice).length <= 5, choice.label);
});

// ---- Request checks (decision 18) ----

const check = (productName, buyer, requests = []) =>
  checkRequest({ productId: byName(productName).product_id, buyer, experience: experienceFor(buyer), requests, products: PRODUCTS }).result;

test('request checks: N with requests on and no open request passes', () => {
  assert.equal(check('Meshwire', riley), CHECK.OK);
});

test('request checks: A, D, requests off, and an unknown product fail', () => {
  assert.equal(check('Tunnelport Access Server (BYOL)', riley), CHECK.APPROVED);
  assert.equal(check('Lumora Image Large', riley), CHECK.DECLINED_BLOCKED);
  assert.equal(check('Meshwire', sam), CHECK.REQUESTS_OFF);
  // Decision 1: Sam hears the requests-off line for a D product too.
  assert.equal(check('Breachkit Linux', sam), CHECK.REQUESTS_OFF);
  assert.equal(checkRequest({ productId: 'prod-nothing', buyer: riley, experience: engineering, requests: [], products: PRODUCTS }).result, CHECK.NOT_FOUND);
});

test('U6: duplicate. An open (Pending) request for the product blocks a new one (frame 13)', () => {
  assert.equal(check('QuarryDB Cloud (pay-as-you-go)', riley, sampleRequests), CHECK.DUPLICATE);
});

test('Q9: only Pending blocks. Declined, Canceled and Expired allow a new request', () => {
  assert.equal(check('Bastion NGFW VM', riley, sampleRequests), CHECK.OK);
  for (const status of ['Declined', 'Canceled', 'Expired', 'Approved']) {
    const requests = [{ ...sampleRequests[0], status }];
    assert.equal(check('QuarryDB Cloud (pay-as-you-go)', riley, requests), CHECK.OK, status);
  }
  // Another account's Pending request doesn't count.
  assert.equal(openRequestFor([{ ...sampleRequests[0], account_id: '999' }], riley.account_id, sampleRequests[0].product_id), null);
});

// ---- Record (U4) ----

test('U4: product_request record has exactly account ID, product, experience, note, PO number, date, status. No buyer name', () => {
  const record = createProductRequest({
    accountId: riley.account_id, productId: 'prod-rqccxbpo', experienceId: 'Engineering',
    note: ' Need this for the Q1 network migration. ', poNumber: '4500012345', date: new Date('2026-11-16T17:00:00Z'),
  });
  assert.deepEqual(Object.keys(record), RECORD_FIELDS);
  assert.deepEqual(record, {
    account_id: '111122223333', product_id: 'prod-rqccxbpo', experience: 'Engineering',
    note: 'Need this for the Q1 network migration.', po_number: '4500012345', date: '2026-11-16T17:00:00.000Z', status: 'Pending',
  });
  assert.ok(!JSON.stringify(record).includes('Riley'));
  assert.equal(formatRequestDate(record.date), 'Nov 16, 2026, 12:00');
});

// ---- U7: recheck at submit (decision 78) ----

test('U7: submit with no change saves a Pending record', () => {
  const result = resolveSubmit({ card: { productId: 'prod-rqccxbpo', note: 'n', poNumber: '' }, buyer: riley, experience: engineering, requests: [], products: PRODUCTS });
  assert.equal(result.outcome, 'submitted');
  assert.equal(result.record.status, 'Pending');
});

test('U7: open a card, change the data, then submit. Each time: Not sent, the frame 16 reason, nothing saved', () => {
  const card = { productId: 'prod-rqccxbpo', note: '', poNumber: '' };
  const changes = {
    approved: () => { const p = clone(PRODUCTS); p.find((x) => x.name === 'Meshwire').approval.Engineering = 'A'; return { products: p }; },
    requests_off: () => ({ experience: { ...engineering, requests_enabled: false } }),
    declined_blocked: () => { const p = clone(PRODUCTS); p.find((x) => x.name === 'Meshwire').approval.Engineering = 'D'; return { products: p }; },
    duplicate: () => ({ requests: [{ account_id: riley.account_id, product_id: 'prod-rqccxbpo', status: 'Pending' }] }),
  };
  for (const [reason, change] of Object.entries(changes)) {
    const args = { card, buyer: riley, experience: engineering, requests: [], products: PRODUCTS, ...change() };
    const result = resolveSubmit(args);
    assert.equal(result.outcome, 'not_sent', reason);
    assert.equal(result.reason, reason);
    assert.equal(result.record, null);
  }
});

// ---- U8: contact details ----

test('U8: Engineering finds exactly eng-software@initech.example and #eng-software-requests. Finance finds none', () => {
  assert.deepEqual(findContacts(engineering.branding_description), { email: 'eng-software@initech.example', slack: '#eng-software-requests' });
  assert.deepEqual(findContacts(finance.branding_description), { email: null, slack: null });
  assert.equal(hasContacts(engineering.branding_description), true);
  assert.equal(hasContacts(finance.branding_description), false);
});

test('contact details: formats code does not know find nothing (known limit)', () => {
  assert.deepEqual(findContacts('Call Jordan at 555-0100. Use C# or #1 rated tools.'), { email: null, slack: null });
});

// ---- Q3: List items, and Q6: the request prompt ----

test('Q3: code lists the products Claude\'s text names, among this turn\'s results, in ranked order', () => {
  const results = searchProducts('VPN').shown;
  const text = 'I found 3 products that match "VPN". Tunnelport Access Server (BYOL) is approved for purchase. Meshwire and Shalecrest UTM 9 aren\'t approved.';
  assert.deepEqual(names(listForTurn({ text, searchResults: results })), ['Meshwire', 'Tunnelport Access Server (BYOL)', 'Shalecrest UTM 9']);
});

test('Q3 short name: "Tunnelport" alone does NOT get a List item for Tunnelport Access Server (BYOL)', () => {
  const results = searchProducts('VPN').shown;
  const text = 'Tunnelport is approved for purchase. Meshwire isn\'t approved.';
  assert.deepEqual(names(namedProducts(text, results)), ['Meshwire']);
  // Without "(BYOL)" it also doesn't match.
  assert.deepEqual(names(namedProducts('Tunnelport Access Server is approved.', results)), []);
  // Case doesn't matter.
  assert.deepEqual(names(namedProducts('tunnelport access server (byol) is approved.', results)), ['Tunnelport Access Server (BYOL)']);
});

test('Q3: a product the text names that is not in this turn\'s results gets no List item', () => {
  const results = searchProducts('Watchtail Pro').shown;
  assert.deepEqual(names(namedProducts('Watchtail Pro is like Meshwire.', results)), ['Watchtail Pro']);
});

test('Q3: an alternatives turn lists the alternatives only, not the asked product (frames 9, 24)', () => {
  const alternatives = findAlternatives(byName('Meshwire'), 'Engineering');
  const text = "I can't buy products for you. Meshwire isn't approved for purchase in your Private Marketplace.";
  assert.deepEqual(names(listForTurn({ text, searchResults: [byName('Meshwire')], alternatives })), ['Tunnelport Access Server (BYOL)']);
});

const promptFor = (args, buyer = riley, requests = []) =>
  requestPromptProduct({ buyer, experience: experienceFor(buyer), requests, products: PRODUCTS, ...args })?.name ?? null;

test('Q6: "Request <product>" shows only when exactly 1 product in the answer can be requested', () => {
  const vpn = searchProducts('VPN').shown;
  // Frame 6: Meshwire and Shalecrest can both be requested, so no prompt.
  assert.equal(promptFor({ text: 'Tunnelport Access Server (BYOL) is approved. Meshwire and Shalecrest UTM 9 aren\'t.', searchResults: vpn }), null);
  // Frame 9: the text names no product. The asked product counts.
  assert.equal(promptFor({ text: '1 approved product ...', alternativesSubject: byName('Meshwire') }), 'Meshwire');
  // Frame 27 5b
  const wt = [byName('Watchtail Pro'), byName('Watchtail Enterprise')];
  assert.equal(promptFor({ text: 'Watchtail Pro is for smaller teams, and Watchtail Enterprise is for large companies.', searchResults: wt }), 'Watchtail Enterprise');
  // Frame 26: approved, no prompt.
  assert.equal(promptFor({ text: 'Watchtail Pro is approved for purchase.', searchResults: [byName('Watchtail Pro')] }), null);
  // Sam: requests off, no prompt.
  assert.equal(promptFor({ text: 'Meshwire isn\'t approved.', searchResults: [byName('Meshwire')] }, sam), null);
  // Open request, no prompt.
  assert.equal(promptFor({ text: 'QuarryDB Cloud (pay-as-you-go) isn\'t approved.', searchResults: [byName('QuarryDB Cloud (pay-as-you-go)')] }, riley, sampleRequests), null);
  // After a hand-off, no prompt.
  assert.equal(promptFor({ text: 'Meshwire isn\'t approved.', searchResults: [byName('Meshwire')], handOff: true }), null);
});

// ---- Copy ----

test('copy: no em dashes and no "experience" in any buyer-facing fixed string', () => {
  const all = [...Object.values(COPY), lines.frame5('Meshwire'), lines.requestsOffNotSent('Meshwire', true), lines.blockedNotSent(false)];
  for (const text of all) {
    assert.ok(!text.includes('—'), text);
    assert.ok(!/experience/i.test(text), text);
  }
});

test('copy: frame 16 hand-off endings follow the contact details (decision 87)', () => {
  assert.match(lines.requestsOffNotSent('Meshwire', true), /contact your administrator\.$/);
  assert.match(lines.blockedNotSent(false), /speak with your administrator\.$/);
  assert.equal(lines.frame5('Meshwire').endsWith(COPY.noteAsk), true);
});
