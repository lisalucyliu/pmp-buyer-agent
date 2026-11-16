import { useEffect, useState } from 'react';

// Cloudscape: no loading state under 1 second (Progressive steps, Generative AI loading states).
// True only when `active` has stayed true for `ms` since `since`.
export const LOADING_DELAY_MS = 1000;

export function useDelayed(active, since, ms = LOADING_DELAY_MS) {
  const [, force] = useState(0);
  const elapsed = Date.now() - (since ?? Date.now());
  const ready = active && elapsed >= ms;
  useEffect(() => {
    if (!active || ready) return undefined;
    const timer = setTimeout(() => force((n) => n + 1), ms - elapsed + 5);
    return () => clearTimeout(timer);
  }, [active, ready, ms, elapsed]);
  return ready;
}
