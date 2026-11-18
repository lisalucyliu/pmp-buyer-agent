// The text Claude sees from each tool result (changes T8 to T13 in docs/build-plan.md section 3).
// Rules held here, and tested (U9, U10, U13):
//   - no URL and no product route (decision 103). Code makes every link.
//   - no contact details (decision 87). "Contact details: yes" or "no" is an app note on each buyer message
//     (server/messages.js), not tool text (Lisa's answers, Nov 16, step 2 part 1 report, Q2).
//   - requests off and D (declined and blocked): the app writes the hand-off bubble, so the text tells
//     Claude not to write it (Q1).
//   - no "declined" and no "blocked" (decision 16).
//   - no "experience" (decisions 22, 24).
import { STATUS, statusFor } from '../shared/catalog.js';

// T8 (decision 16)
export const STATUS_LABELS = {
  [STATUS.APPROVED]: 'approved',
  [STATUS.NOT_APPROVED]: 'not approved',
  [STATUS.DECLINED_BLOCKED]: "not approved. This product can't be requested",
};

// T10 (decision 91). The shared requests line used by search_products and check_request_settings.
export function requestsStatusText(experience) {
  if (experience.requests_enabled) return "Product requests are enabled in the buyer's Private Marketplace.";
  return (
    "Product requests are turned off in the buyer's Private Marketplace. Do not offer to submit a " +
    'request. Do not call submit_request. Do not write that requests are turned off, and do not write ' +
    'a hand-off line. The app adds them.'
  );
}

// T9 (decisions 103, 22). Description before status, category added, no link.
// Requests off: a D (declined and blocked) product shows as "not approved", so the buyer hears the
// requests-off line, not "This product can't be requested" (decision 1).
function productLine(product, experience) {
  const status = statusFor(product, experience.id);
  const shown = !experience.requests_enabled && status === STATUS.DECLINED_BLOCKED ? STATUS.NOT_APPROVED : status;
  const label = STATUS_LABELS[shown];
  return (
    `- ${product.name} by ${product.vendor} (${product.type}). ${product.description}. ` +
    `Category: ${product.category}. Status: ${label}. product_id: ${product.product_id}.`
  );
}

// Run A fix 4 (Lisa, Nov 17), from the A1 rerun: Claude offered a request after a search. With requests
// off there is no request to offer, so the line is left out.
export const SEARCH_NO_REQUEST_OFFER =
  'Do not offer a request in your answer unless the buyer asks about requests. The app handles requests.';

// Run B fix 5 (Lisa, Nov 17), from B2: with requests on, Claude did not look for alternatives for a
// product that isn't approved. Fix 7 (Lisa, Nov 17), from run-b2 B7: the same with requests off.
// Only for a text search with exactly 1 product that isn't approved (this includes a product that
// can't be requested), before alternatives were shown or declined.
export const nextAlternativesText = (productId) =>
  `Next, call search_products with alternatives_for set to ${productId}, unless the buyer asked about price.`;

function alternativesNext(result, experience, flags) {
  if (result.needsClarify || result.total !== 1 || result.shown.length !== 1) return null;
  if (flags?.alternativesShown || flags?.alternativesDeclined) return null;
  const [product] = result.shown;
  if (statusFor(product, experience.id) === STATUS.APPROVED) return null;
  return nextAlternativesText(product.product_id);
}

// search_products, text search. result is from shared/search.js searchProducts().
// flags: the request flags (alternativesShown, alternativesDeclined), for fixes 5 and 7.
// Requests off: no fix 4 line, so the fix 5 line goes at the end (fix 7).
export function searchText(result, experience, flags = {}) {
  const next = alternativesNext(result, experience, flags);
  return [
    searchBody(result, experience),
    ...(experience.requests_enabled ? [SEARCH_NO_REQUEST_OFFER] : []),
    ...(next ? [next] : []),
  ].join('\n');
}

function searchBody(result, experience) {
  const header = requestsStatusText(experience);
  if (result.total === 0) {
    return (
      `${header}\nNo products matched "${result.query}". Ask the buyer for a different name or what ` +
      'the product does, then search again.'
    );
  }
  // T1 (decision 19): more than 5 matches. The app asks the buyer to narrow it down (frame 7).
  // Fix 9 (Lisa, Nov 17), from run-b3 B5: Claude gets the frame 7 question word for word.
  if (result.needsClarify) {
    return (
      `${header}\n${result.total} products matched "${result.query}". The app shows the buyer choices ` +
      'to narrow it down, so do not list or name the products. Ask the buyer this question, word for ' +
      `word: "${result.total} products match "${result.query}". What do you need it for?" Do not name ` +
      'types of products, and do not add other sentences about the results.'
    );
  }
  return [header, ...result.shown.map((product) => productLine(product, experience))].join('\n');
}

// Run A fix 2 (Lisa, Nov 17): with requests enabled, the app shows the Request option, so Claude
// must not offer one. With requests off there is no Request option, so the line is left out.
export const NO_REQUEST_OFFER = 'Do not offer a request in your answer. The app shows the Request option.';

// search_products with alternatives_for (T2, Q2 answer A). result is from shared/alternatives.js.
export function alternativesText(subject, result, experience) {
  const header = requestsStatusText(experience);
  const noOffer = experience.requests_enabled ? ` ${NO_REQUEST_OFFER}` : '';
  if (result.total === 0) {
    return (
      `${header}\nNo approved products in the buyer's Private Marketplace are in the same category as ` +
      `${subject.name} (${subject.category}).${noOffer}`
    );
  }
  const more = result.more ? ` The app shows the first ${result.items.length} and a link to the rest.` : '';
  return [
    header,
    `${result.total} approved ${result.total === 1 ? 'product' : 'products'} in the buyer's Private ` +
      `Marketplace ${result.total === 1 ? 'is' : 'are'} in the same category as ${subject.name} ` +
      `(${subject.category}).${more}`,
    ...result.items.map((product) => productLine(product, experience)),
    ...(noOffer ? [NO_REQUEST_OFFER] : []),
  ].join('\n');
}

export function unknownProductText(productId) {
  return `No product found with product_id ${productId}. Use search_products to find the correct product_id.`;
}

// submit_request results that Claude sees (T11, T12, T13). A pass shows the card and ends the turn,
// so Claude gets no result text for it this turn (build plan section 2, the confirm card).
export const submitText = {
  notFound: (productId) => `Request not shown. ${unknownProductText(productId)}`,
  // T11 (decision 91)
  requestsOff: (product) =>
    `Request not shown. Product requests are turned off in the buyer's Private Marketplace, so the app ` +
    `can't send a request for ${product.name}. The app tells the buyer and adds the hand-off line. Do not ` +
    'write them. Do not call submit_request again. If the buyer wants alternatives, use search_products ' +
    'with alternatives_for.',
  // T12 (decision 16)
  cantRequest: (product) =>
    `Request not shown. ${product.name}: This product can't be requested. The app tells the buyer and adds ` +
    'the hand-off line. Do not write them. Do not call submit_request again for this product. Offer to ' +
    'search for approved alternatives.',
  // T13 (decision 103)
  approved: (product) =>
    `${product.name} is already approved for purchase in the buyer's Private Marketplace. No request needed.`,
};

export const invalidInputText = (detail) => `The tool input was not valid: ${detail}. Try again with valid input.`;
