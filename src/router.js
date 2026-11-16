// A small router: the browser history API, no package. Each page is a real path, so every link has an href
// and the buyer can open it in a new tab (Cloudscape Link: use onFollow, not onClick).
import { useSyncExternalStore } from 'react';

const listeners = new Set();
function notify() {
  for (const listener of listeners) listener();
}
window.addEventListener('popstate', notify);

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => window.location.pathname + window.location.search;

export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot);
  const url = new URL(href, window.location.origin);
  return { path: url.pathname, params: url.searchParams, href };
}

// Keeps ?buyer= on every link, so a test URL stays on the same buyer (Q1 option B).
// In dev only, it also keeps the fake agent switches (dev/fakeAgentRoute.js) and the E3 switch.
const KEEP = import.meta.env.DEV ? ['buyer', 'fakeDelay', 'fakeError', 'devCrash'] : ['buyer'];

export function withBuyer(href) {
  if (!href.startsWith('/')) return href;
  const current = new URLSearchParams(window.location.search);
  const url = new URL(href, window.location.origin);
  for (const key of KEEP) {
    if (current.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, current.get(key));
  }
  return url.pathname + url.search;
}

export function navigate(href, { replace = false } = {}) {
  const target = withBuyer(href);
  if (replace) window.history.replaceState(null, '', target);
  else window.history.pushState(null, '', target);
  window.scrollTo(0, 0);
  notify();
}

// For Cloudscape onFollow handlers. Lets the browser handle modified clicks (new tab).
export function followHandler(event) {
  const { href, external } = event.detail ?? {};
  if (!href || external || href.startsWith('http')) return;
  event.preventDefault();
  navigate(href);
}
