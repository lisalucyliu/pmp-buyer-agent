// Maps a failure in the server function to an error type (row 6 Build notes). The browser picks the
// Alert from the type. The rule (429 or 529 gives E1a, any other cause gives E1b) is in
// shared/errorTypes.js, so the browser and the server use the same code.
import { ERROR_TYPE, errorTypeForStatus } from '../shared/errorTypes.js';

// error: anything thrown while the server talks to Claude. An SDK API error has a numeric `status`.
// A connection error between the server and Claude, or a cause with no status, is E1b (not available).
export function errorTypeForError(error) {
  const status = typeof error?.status === 'number' ? error.status : null;
  return status === null ? ERROR_TYPE.E1B : errorTypeForStatus(status);
}

// A response Claude ended in a way the app can't show: a refusal (safety classifier), or the output
// cut off at max_tokens. Both are E1b (not available).
export class UnusableResponseError extends Error {
  constructor(stopReason) {
    super(`Claude response ended with stop_reason ${stopReason}`);
    this.stopReason = stopReason;
  }
}
