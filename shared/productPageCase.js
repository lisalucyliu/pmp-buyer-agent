// Frame 3: which case a product page shows (decided Nov 13).
//   approved:     no Alert, "View purchase options" enabled, purple badge, no agent button
//   requestable:  N (not approved), requests on, no open request. "Request approval" shows
//   pending:      a Pending request exists. "Request approval" hidden
//   requests_off: Sam. "Request approval" hidden
//   blocked:      D (declined and blocked). "Request approval" hidden
// Requests off is checked before D, so Sam sees the requests-off Alert for a D product too (decision 1).
import { STATUS, statusFor } from './catalog.js';
import { openRequestFor } from './productRequest.js';

export const PAGE_CASE = {
  APPROVED: 'approved',
  REQUESTABLE: 'requestable',
  PENDING: 'pending',
  REQUESTS_OFF: 'requests_off',
  BLOCKED: 'blocked',
};

export function productPageCase({ product, buyer, experience, requests }) {
  const status = statusFor(product, experience.id);
  if (status === STATUS.APPROVED) return PAGE_CASE.APPROVED;
  if (!experience.requests_enabled) return PAGE_CASE.REQUESTS_OFF;
  if (status === STATUS.DECLINED_BLOCKED) return PAGE_CASE.BLOCKED;
  if (openRequestFor(requests, buyer.account_id, product.product_id)) return PAGE_CASE.PENDING;
  return PAGE_CASE.REQUESTABLE;
}
