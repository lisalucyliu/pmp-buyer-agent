// The one check list for a product request (decision 18). The same code runs:
//   1. when the agent would open the card (submit_request), and
//   2. again when the buyer selects "Submit request" (decision 78, recheck at submit).
// Checks: requests on, product N (not approved), no open (Pending) request for this product.
import { STATUS, findProduct, statusFor } from './catalog.js';
import { openRequestFor } from './productRequest.js';

export const CHECK = {
  OK: 'ok',
  NOT_FOUND: 'not_found',
  REQUESTS_OFF: 'requests_off', // Checked first: Sam hears the requests-off line even for a D product (decision 1).
  APPROVED: 'approved',
  DECLINED_BLOCKED: 'declined_blocked', // D (declined and blocked)
  DUPLICATE: 'duplicate', // A Pending request exists (frame 13)
  // The note is empty (Lisa, Nov 21). checkRequest does not return it: only the check at "Submit request"
  // (shared/submitRequest.js) does, after the checks above pass.
  NOTE_MISSING: 'note_missing',
};

export function checkRequest({ productId, buyer, experience, requests, products }) {
  const product = findProduct(productId, products);
  if (!product) return { result: CHECK.NOT_FOUND, product: null };
  if (!experience.requests_enabled) return { result: CHECK.REQUESTS_OFF, product };
  const status = statusFor(product, experience.id);
  if (status === STATUS.APPROVED) return { result: CHECK.APPROVED, product };
  if (status === STATUS.DECLINED_BLOCKED) return { result: CHECK.DECLINED_BLOCKED, product };
  if (openRequestFor(requests, buyer.account_id, product.product_id)) return { result: CHECK.DUPLICATE, product };
  return { result: CHECK.OK, product };
}

// True when the buyer can send a request for this product now (support prompt rule, Q6).
export function canRequest(args) {
  return checkRequest(args).result === CHECK.OK;
}
