// Frame 7 answer: the buyer picked a choice in the dialog. Code answers it, with no Claude call
// (0 paid requests), because a choice shows ALL products in its categories (Q4) and the list order is
// a code rule (Q4, option B: approved for this buyer first, then catalog order).
// The text is a draft (step 1 guess). The spec has no copy for the result of a choice.
import { isApproved } from './catalog.js';
import { productsForChoice } from './clarify.js';
import { lines } from './copy.js';

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
export const joinNames = (names) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export function choiceAnswer(choice, experienceId) {
  const products = productsForChoice(choice, experienceId);
  const approved = products.filter((p) => isApproved(p, experienceId)).map((p) => p.name);
  const notApproved = products.filter((p) => !isApproved(p, experienceId)).map((p) => p.name);
  const count = products.length;
  const parts = [`${count} ${count === 1 ? 'product' : 'products'} in your Private Marketplace ${count === 1 ? 'is' : 'are'} used for ${lowerFirst(choice.label)}.`];
  if (approved.length) parts.push(`${joinNames(approved)} ${approved.length === 1 ? 'is' : 'are'} approved for purchase.`);
  if (notApproved.length) parts.push(`${joinNames(notApproved)} ${notApproved.length === 1 ? "isn't" : "aren't"} approved.`);
  return {
    products,
    stepLoading: lines.choiceLoading(choice.label),
    stepDone: lines.choiceDone(joinNames(choice.categories), count),
    stepHeader: lines.choiceHeader(choice.label),
    text: parts.join(' '),
  };
}
