// Approved alternatives (row 2, decision 62). Code finds them, so the result is the same each time.
// Alternatives = A (approved) products for this buyer in the same category as the asked product.
// They are ranked with the search ranking rule (decision 19) against the asked product's name,
// so ties keep catalog order. Top 5, plus a Discover link when there are more.
import { PRODUCTS, isApproved } from './catalog.js';
import { discoverRoute } from './productRoutes.js';
import { MAX_RESULTS, matchTier } from './search.js';

export function findAlternatives(subject, experienceId, products = PRODUCTS) {
  const all = products
    .map((product, index) => ({ product, index }))
    .filter(({ product }) =>
      product.product_id !== subject.product_id &&
      product.category === subject.category &&
      isApproved(product, experienceId))
    .map((entry) => ({ ...entry, tier: matchTier(entry.product, subject.name) || 99 }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map(({ product }) => product);

  const more = all.length > MAX_RESULTS;
  return {
    subjectId: subject.product_id,
    category: subject.category,
    total: all.length,
    items: all.slice(0, MAX_RESULTS),
    more,
    moreHref: more ? discoverRoute({ approvedOnly: true, category: subject.category }) : null,
  };
}
