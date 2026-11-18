// Calls to /api/requests (api/requests.js). Each one sends the visitor ID.
// Each function returns the server's JSON, or throws when the call fails (no reply, or an error status).
import { visitorId } from './state/visitor.js';

async function call(url, options) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) throw new Error(`requests ${response.status}`);
  return response.json();
}

export function readRequests(accountId) {
  const params = new URLSearchParams({ visitor: visitorId(), account: accountId });
  return call(`/api/requests?${params}`, { method: 'GET' });
}

export function postRequest(record) {
  return call('/api/requests', { method: 'POST', body: JSON.stringify({ visitor: visitorId(), record }) });
}

export function cancelStoredRequest(requestId) {
  return call('/api/requests', { method: 'PATCH', body: JSON.stringify({ visitor: visitorId(), requestId }) });
}
