// What happens when the buyer selects "Submit request" on the card (frames 12, 14, 16).
// Runs in the browser with the current data. No call to Claude (decision 73).
// Recheck at submit (decision 78): the same checks as before the card.
import { CHECK, checkRequest } from './requestChecks.js';
import { createProductRequest } from './productRequest.js';

export function resolveSubmit({ card, buyer, experience, requests, products, date = new Date() }) {
  const check = checkRequest({ productId: card.productId, buyer, experience, requests, products });
  if (check.result !== CHECK.OK) {
    return { outcome: 'not_sent', reason: check.result, product: check.product, record: null };
  }
  const record = createProductRequest({
    accountId: buyer.account_id,
    productId: card.productId,
    experienceId: experience.id,
    note: card.note ?? '',
    poNumber: card.poNumber ?? '',
    date,
  });
  return { outcome: 'submitted', reason: CHECK.OK, product: check.product, record };
}
