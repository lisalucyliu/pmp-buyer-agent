// Frame 7: choices when a search matches more than 5 products (Lisa's answers Nov 16, Q4: C plus A).
// - A search text with fixed choices in data/clarifyChoices.json ("security") gets those choices, in that order.
// - Any other search: up to 4 choices made from the categories of the matches,
//   most matches first, then catalog order.
// A choice shows ALL products in its categories, not only the ones that matched the search text.
// Order of a choice result (Q4, option B, Lisa's answers to the step 1 report): products approved for
// this buyer first, then the rest. Catalog order inside each group.
import fixedChoices from '../data/clarifyChoices.json' with { type: 'json' };
import { PRODUCTS, isApproved } from './catalog.js';
import { normalize } from './search.js';

export const MAX_CHOICES = 4;

export function clarifyChoices(query, matches, products = PRODUCTS) {
  const fixed = fixedChoices[normalize(query)];
  if (Array.isArray(fixed)) return fixed.map(({ label, categories }) => ({ label, categories: [...categories] }));

  const counts = new Map();
  for (const product of matches) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  const firstIndex = (category) => products.findIndex((product) => product.category === category);
  return [...counts.keys()]
    .sort((a, b) => counts.get(b) - counts.get(a) || firstIndex(a) - firstIndex(b))
    .slice(0, MAX_CHOICES)
    .map((category) => ({ label: category, categories: [category] }));
}

// experienceId: the buyer's Private Marketplace experience. Without it, the result is in catalog order.
export function productsForChoice(choice, experienceId = null, products = PRODUCTS) {
  const inChoice = products.filter((product) => choice.categories.includes(product.category));
  if (!experienceId) return inChoice;
  return [
    ...inChoice.filter((product) => isApproved(product, experienceId)),
    ...inChoice.filter((product) => !isApproved(product, experienceId)),
  ];
}
