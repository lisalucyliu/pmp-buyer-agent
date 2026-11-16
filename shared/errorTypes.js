// Error types (row 6 Build notes). Code picks the type, so the Alert says the real reason.
//   connection: the request didn't reach the server, or no reply came before any text
//   E1a (busy): 429 too many requests, 529 overloaded
//   E1b (not available): 401, 403, 500, or any other error, including one with no known cause
//   E2 (stops halfway): text started, then the stream ended with no "done"
//   E3 (drawer fails to load): a crash while the drawer renders (DrawerErrorBoundary)
export const ERROR_TYPE = { CONNECTION: 'connection', E1A: 'E1a', E1B: 'E1b', E2: 'E2', E3: 'E3' };

export function errorTypeForStatus(status) {
  return status === 429 || status === 529 ? ERROR_TYPE.E1A : ERROR_TYPE.E1B;
}
