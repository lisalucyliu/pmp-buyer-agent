// Catalog, buyers and experiences. Plain JavaScript: the browser and the server both import this file.
// data/catalog.json is the source of truth for the fictional catalog.
import catalog from '../data/catalog.json' with { type: 'json' };
import buyers from '../data/buyers.json' with { type: 'json' };
import experiences from '../data/experiences.json' with { type: 'json' };

export const PRODUCTS = catalog;
export const BUYERS = buyers;
export const EXPERIENCES = experiences;

// Approval status codes in catalog.json.
// A (approved), N (not approved), D (declined and blocked).
export const STATUS = { APPROVED: 'A', NOT_APPROVED: 'N', DECLINED_BLOCKED: 'D' };

export function findProduct(productId, products = PRODUCTS) {
  return products.find((product) => product.product_id === productId) ?? null;
}

export function findBuyer(buyerId) {
  return BUYERS.find((buyer) => buyer.id === buyerId) ?? null;
}

export function experienceFor(buyer, experienceList = EXPERIENCES) {
  return experienceList.find((experience) => experience.id === buyer.experience_id) ?? null;
}

// The product's status in one experience: 'A', 'N' or 'D'.
export function statusFor(product, experienceId) {
  return product.approval[experienceId];
}

export function isApproved(product, experienceId) {
  return statusFor(product, experienceId) === STATUS.APPROVED;
}

// The vendor line is left out when the vendor name equals the product name (frame 6, decision 21).
export function vendorDiffers(product) {
  return product.vendor.trim().toLowerCase() !== product.name.trim().toLowerCase();
}
