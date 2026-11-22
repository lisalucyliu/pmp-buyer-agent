// product_request: one term in code for a buyer's request to approve a product.
// Buyers see Product requests. Admins see Approval requests. (decisions 23, 64)
//
// The record holds exactly: account ID, product, experience, note, PO number, date, status.
// No buyer name (decision 25).

export const REQUEST_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
};

// Status indicator type for each status (frame 2).
export const STATUS_INDICATOR_TYPE = {
  Pending: 'pending',
  Approved: 'success',
  Declined: 'error',
  Canceled: 'stopped',
  Expired: 'stopped',
};

export const RECORD_FIELDS = ['account_id', 'product_id', 'experience', 'note', 'po_number', 'date', 'status'];

// The note is required (Lisa, Nov 21). The same test as the backup form's "Reason for request" field.
// The card check at "Submit request" and the save in api/requests.js use it too.
export const hasNote = (note) => typeof note === 'string' && note.trim().length > 0;

export function createProductRequest({ accountId, productId, experienceId, note = '', poNumber = '', date = new Date() }) {
  return {
    account_id: accountId,
    product_id: productId,
    experience: experienceId,
    note: note.trim(),
    po_number: poNumber.trim(),
    date: date.toISOString(),
    status: REQUEST_STATUS.PENDING,
  };
}

// Only Pending blocks a new request (Lisa's answers Nov 16, Q9).
export function openRequestFor(requests, accountId, productId) {
  return requests.find((request) =>
    request.account_id === accountId &&
    request.product_id === productId &&
    request.status === REQUEST_STATUS.PENDING) ?? null;
}

// "Nov 10, 2026, 10:42" in UTC-05:00, the time zone in the Date requested column header.
export function formatRequestDate(isoDate) {
  const date = new Date(new Date(isoDate).getTime() - 5 * 60 * 60 * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (value) => String(value).padStart(2, '0');
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
