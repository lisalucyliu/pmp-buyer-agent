// The 3 tools: their definitions (what Claude reads) and the code that runs them.
// Ported from ~/pmp-tiny-agent/tiny_agent.py (TOOLS, lines 146 to 238, and the tool functions) with
// changes T1 to T7 in docs/build-plan.md section 3. docs/prompt-changes.md shows each before and after.
// Every rule comes from shared/: search and ranking, alternatives, request checks, contacts.
import { findProduct } from '../shared/catalog.js';
import { findAlternatives } from '../shared/alternatives.js';
import { COPY, lines } from '../shared/copy.js';
import { CHECK, checkRequest } from '../shared/requestChecks.js';
import { searchProducts } from '../shared/search.js';
import { alternativesText, invalidInputText, requestsStatusText, searchText, submitText, unknownProductText } from './toolText.js';

export const TOOLS = [
  {
    name: 'search_products',
    // T1, T2
    description:
      "Searches the company's full software catalog by product name, vendor, or what the product does. " +
      'Each result shows the product name, vendor, type, a one-line description, its category, and its ' +
      "approval status in the buyer's Private Marketplace. Use this for any question about a product, " +
      'including vague or misspelled requests. If the buyer names a vendor, show all of that vendor\'s ' +
      'products. Note that a product can include a vendor\'s name but be sold by a different vendor; ' +
      'always report the actual vendor. Results show at most 5 products. If more matched, the app asks ' +
      'the buyer to narrow it down, so don\'t list them. Set alternatives_for to a product_id to get the ' +
      'approved products that do the same job as that product. Use it when the buyer asks for approved ' +
      'alternatives, and when a product the buyer asked about is not approved. Do not use it for a ' +
      'question about price or about what a product does. Describe the alternatives with one shared line ' +
      'about the job they do, not a reason for each product. Searching a vendor name returns all of that ' +
      'vendor\'s products. Do not search again for a narrower version of the same query, because the ' +
      'first results already include those products. Search again only if the buyer asks about ' +
      'something different.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'What to search for: a product name, vendor, or what it does. With alternatives_for, the product name.',
        },
        alternatives_for: {
          type: 'string',
          description:
            'A product_id from a search_products result. Returns the products approved for purchase in the ' +
            "buyer's Private Marketplace that are in the same category as this product.",
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_request_settings',
    // T3
    description:
      "Checks if product requests are enabled for the buyer's Private Marketplace. Only use this if the " +
      'buyer asks about requests without searching for a product first. search_products results already ' +
      'include the request status, so do not call this tool after a search.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'submit_request',
    // T4, T5, T6, T7
    description:
      "Sends a request to the buyer's Private Marketplace administrator to approve one product for " +
      'purchase. This tool shows the buyer a card to confirm. Nothing is sent until the buyer selects ' +
      'Submit request. Use this only when search_products shows the product is not approved. Do not use ' +
      'this tool if the product is already approved, or if requests are disabled. In those cases, tell ' +
      'the buyer. If they want alternatives, use search_products with alternatives_for. This tool does ' +
      'not approve or purchase the product. Only the administrator can approve it. Do not suggest that ' +
      'approval is likely. If the result says the product can\'t be requested, the app tells the buyer. ' +
      'Do not offer a request for it.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'The product_id from a search_products result. Never guess this from the product name.',
        },
        note: {
          type: 'string',
          description: 'An optional note from the buyer to their administrator, in their own words. Leave empty if the buyer has none.',
        },
        po_number: {
          type: 'string',
          description: 'A purchase order number, if the buyer gives one.',
        },
      },
      required: ['product_id'],
    },
  },
];

// eager_input_streaming means the API doesn't validate tool input, so code checks it before it runs a tool.
const isOptionalString = (value) => value === undefined || typeof value === 'string';
export function validateToolInput(name, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'the input must be an object';
  if (name === 'search_products') {
    if (typeof input.query !== 'string') return 'query must be a string';
    if (!isOptionalString(input.alternatives_for)) return 'alternatives_for must be a string';
    return null;
  }
  if (name === 'check_request_settings') return null;
  if (name === 'submit_request') {
    if (typeof input.product_id !== 'string' || !input.product_id) return 'product_id must be a string';
    if (!isOptionalString(input.note) || !isOptionalString(input.po_number)) return 'note and po_number must be strings';
    return null;
  }
  return `unknown tool ${name}`;
}

// What one buyer turn has found so far. Code uses it after Claude's text: the List (Q3), the request
// prompt (Q6), the frame 7 dialog and the no-match prompt.
export function newTurnState() {
  return {
    searchResults: [],
    alternatives: null,
    alternativesSubject: null,
    clarify: null,
    searches: 0,
    emptySearches: 0,
    notSent: [], // Products submit_request couldn't send (requests off, D). They get a hand-off bubble.
    stepCount: 0,
    calls: [],
  };
}

// Runs one tool. Returns { text, events, endTurn }.
//   text      what Claude gets back (null when the turn ends here)
//   events    UI events for the browser
//   endTurn   true: no more Claude calls this turn (the card, the note ask, a duplicate)
// ctx: { buyer, experience, requests, flags, turn }
export function runTool(name, input, ctx) {
  const invalid = validateToolInput(name, input);
  if (invalid) return { text: invalidInputText(invalid), events: [], endTurn: false, isError: true };
  if (name === 'search_products') return input.alternatives_for ? runAlternatives(input, ctx) : runSearch(input, ctx);
  if (name === 'check_request_settings') return { text: requestsStatusText(ctx.experience), events: [], endTurn: false };
  return runSubmit(input, ctx);
}

function stepId(turn) {
  turn.stepCount += 1;
  return `step-${turn.stepCount}`;
}

function runSearch({ query }, ctx) {
  const { turn, experience } = ctx;
  const result = searchProducts(query);
  const id = stepId(turn);
  turn.searches += 1;
  if (result.total === 0) turn.emptySearches += 1;
  if (result.needsClarify) turn.clarify = result;
  else turn.searchResults.push(...result.shown);
  return {
    text: searchText(result, experience),
    events: [
      { type: 'step', id, status: 'loading', text: lines.searchLoading(result.query) },
      { type: 'step', id, status: 'success', text: lines.searchDone(result.total), header: lines.searchHeader(result.query) },
    ],
    endTurn: false,
  };
}

function runAlternatives({ alternatives_for: productId }, ctx) {
  const { turn, experience } = ctx;
  const subject = findProduct(productId);
  if (!subject) return { text: unknownProductText(productId), events: [], endTurn: false };
  const result = findAlternatives(subject, experience.id);
  const id = stepId(turn);
  turn.alternatives = result;
  turn.alternativesSubject = subject;
  return {
    text: alternativesText(subject, result, experience),
    events: [
      { type: 'step', id, status: 'loading', text: lines.alternativesLoading(subject.name) },
      { type: 'step', id, status: 'success', text: lines.alternativesDone(subject.category, result.total), header: lines.alternativesHeader(subject.name) },
      { type: 'flags', set: { alternativesShown: true } },
      { type: 'subject', productId: subject.product_id },
    ],
    endTurn: false,
  };
}

// The card, or the reason there is no card (decision 18). The same check code runs again in the
// browser at "Submit request" (decision 78).
function runSubmit({ product_id: productId, note = '', po_number: poNumber = '' }, ctx) {
  const { buyer, experience, requests, flags, turn } = ctx;
  const check = checkRequest({ productId, buyer, experience, requests });
  const product = check.product;
  if (check.result === CHECK.NOT_FOUND) return { text: submitText.notFound(productId), events: [], endTurn: false };

  const subject = { type: 'subject', productId: product.product_id };
  if (check.result === CHECK.OK) {
    // The note and PO number ask comes first, once per conversation (decision 66, Q5).
    if (!flags.noteAsked) {
      return {
        text: null,
        events: [
          subject,
          { type: 'note_ask', productId: product.product_id },
          { type: 'prompts', alignment: 'vertical', editable: false, items: [{ id: 'continue-without-note', text: COPY.continueWithoutNote }] },
        ],
        endTurn: true,
      };
    }
    return {
      text: null,
      events: [subject, { type: 'card', productId: product.product_id, note: note.trim(), poNumber: poNumber.trim() }],
      endTurn: true,
    };
  }
  if (check.result === CHECK.DUPLICATE) {
    // Frame 13: the fixed line, no card and no support prompts.
    return { text: null, events: [subject, { type: 'fixed', key: 'duplicate', productId: product.product_id }], endTurn: true };
  }
  if (check.result === CHECK.APPROVED) {
    turn.searchResults.push(product);
    return { text: submitText.approved(product), events: [], endTurn: false };
  }
  turn.notSent.push(product);
  if (check.result === CHECK.REQUESTS_OFF) return { text: submitText.requestsOff(product), events: [], endTurn: false };
  return { text: submitText.cantRequest(product), events: [], endTurn: false };
}
