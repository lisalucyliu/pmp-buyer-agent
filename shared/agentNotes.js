// Text that code writes for Claude (not for the buyer). The browser puts it in the history it sends.
// Rule (decision 16, U10): no "declined", no "blocked", no URL.
import { CHECK } from './requestChecks.js';

// Build plan section 2, card step 7: on the buyer's next message, the result of the card goes into the
// history, so Claude knows what happened without a call at the time of the click.
const NOT_SENT_REASON = {
  [CHECK.DUPLICATE]: 'A request for this product is already pending.',
  [CHECK.APPROVED]: 'The product is now approved, so no request was needed.',
  [CHECK.REQUESTS_OFF]: 'Product requests are now turned off.',
  [CHECK.DECLINED_BLOCKED]: "This product can't be requested.",
  [CHECK.NOT_FOUND]: 'The product was not found.',
};

export const cardNotes = {
  sent: 'The buyer selected Submit request. The request was sent.',
  notSent: (reason) => `The buyer selected Submit request. The request was not sent. ${NOT_SENT_REASON[reason] ?? ''}`.trim(),
  cancelled: 'The buyer selected Cancel. Nothing was sent.',
};
