// The visitor ID (decision 1 of prompt 2j). A random ID that this browser keeps, so a visitor sees only
// their own product requests. It is not a login. If localStorage fails (for example in a private window),
// the ID lasts for this page session only.
const KEY = 'pmp-visitor-id';
let sessionId = null;

export function visitorId() {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    sessionId ??= crypto.randomUUID();
    return sessionId;
  }
}
