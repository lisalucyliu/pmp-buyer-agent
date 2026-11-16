// Calls /api/agent, reads the NDJSON stream (one JSON object per line), and finds the error type.
// Connection error and E2 (stops halfway) are found here. E1a and E1b come from the server's error event.
import { ERROR_TYPE, errorTypeForStatus } from '../shared/errorTypes.js';

// No reply before this time counts as a connection error (frame 21).
export const FIRST_EVENT_TIMEOUT_MS = 45_000;

export async function streamAgent(body, onEvent) {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), FIRST_EVENT_TIMEOUT_MS);
  let sawText = false;
  let sawDone = false;

  let response;
  try {
    response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return { errorType: ERROR_TYPE.CONNECTION };
  }
  if (!response.ok || !response.body) {
    clearTimeout(timer);
    return { errorType: errorTypeForStatus(response.status) };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      clearTimeout(timer);
      timer = null;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.type === 'error') return { errorType: event.errorType ?? ERROR_TYPE.E1B };
        if (event.type === 'text') sawText = true;
        if (event.type === 'done') sawDone = true;
        onEvent(event);
      }
    }
  } catch {
    return { errorType: sawText ? ERROR_TYPE.E2 : ERROR_TYPE.CONNECTION };
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!sawDone) return { errorType: sawText ? ERROR_TYPE.E2 : ERROR_TYPE.CONNECTION };
  return { errorType: null };
}
