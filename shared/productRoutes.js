// Console routes in the prototype. Code makes every link. Claude never sees a URL (decision 103).
// The example.com links from the Week 1 catalog are not used.
import routes from '../data/productRoutes.json' with { type: 'json' };

export const ROUTES = {
  myPrivateMarketplace: '/',
  productRequests: '/product-requests',
  discover: '/discover',
  requestForm: '/request-form',
};

export function productRoute(productId) {
  const route = routes[productId];
  if (!route) throw new Error(`No product route for ${productId}`);
  return route;
}

export function productIdForRoute(path) {
  return Object.keys(routes).find((productId) => routes[productId] === path) ?? null;
}

// Discover page. approvedOnly turns on the Approved products filter. category adds the category filter
// (row 2: "more than 5 alternatives" link).
export function discoverRoute({ approvedOnly = false, category = '' } = {}) {
  const params = new URLSearchParams();
  if (approvedOnly) params.set('approved', 'true');
  if (category) params.set('category', category);
  const query = params.toString();
  return query ? `${ROUTES.discover}?${query}` : ROUTES.discover;
}

// Backup request form. The product is pre-filled when known.
export function requestFormRoute(productId = '') {
  return productId ? `${ROUTES.requestForm}?product=${encodeURIComponent(productId)}` : ROUTES.requestForm;
}
