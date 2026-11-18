// One store that the pages and the drawer both read (build plan section 1, src/state).
// Buyer, the request list, the drawer state and the conversation.
// Requests are saved in Supabase for each browser (prompt 2j): code reads this visitor's rows from
// /api/requests on load and when the buyer switches, and merges them with the 2 sample rows. The sample
// rows are not in Supabase, so a cancel of a sample row stays in this browser session only.
// When the server says storage is off (no Supabase variables: local runs, Vercel Preview, all tests),
// new requests stay in the browser session only, and a page reload removes them (decision 79).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import sampleRequests from '../../data/sampleRequests.json';
import { BUYERS, EXPERIENCES, PRODUCTS, experienceFor, findBuyer } from '../../shared/catalog.js';
import { REQUEST_STATUS } from '../../shared/productRequest.js';
import { cancelStoredRequest, postRequest, readRequests } from '../requestsClient.js';
import { frame5HistoryText, frame5Turn } from './frame5.js';
import { newId } from './ids.js';

const StoreContext = createContext(null);

function initialBuyerId() {
  const fromUrl = new URLSearchParams(window.location.search).get('buyer');
  return findBuyer(fromUrl) ? fromUrl : BUYERS[0].id;
}

export const EMPTY_CONVERSATION = {
  turns: [], // UI turns: { kind: 'user' | 'assistant', ... }
  history: [], // What goes to /api/agent: { role, content }
  flags: { noteAsked: false, alternativesShown: false, alternativesDeclined: false },
  subjectProductId: null, // The product the conversation is about, when code knows it (frame 5)
  clarify: null, // Open frame 7 dialog
};

// Dev and test only: lets a Playwright test slow down or break the save (E4, frame 12).
// Read from window at save time, so it is never set in the app. Vite removes it from the build.
function devSaveOptions() {
  if (!import.meta.env.DEV) return {};
  return { delayMs: window.__pmpSaveDelayMs ?? 0, fail: Boolean(window.__pmpSaveFails) };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SAMPLE_IDS = new Set(sampleRequests.map((request) => request.request_id));
const isSample = (request) => SAMPLE_IDS.has(request.request_id);
// Rows from Supabase have `stored: true`. Rows without it live in this browser session only.
const storedRow = (row) => ({ ...row, stored: true });

// The server checked the record and did not save it (for example a duplicate that the browser did
// not know about). `reason` is a CHECK value from shared/requestChecks.js, so the app shows the same
// result as its own check.
export class RequestNotSentError extends Error {
  constructor(reason) {
    super('Request not sent');
    this.reason = reason;
  }
}

export function StoreProvider({ children }) {
  const [buyerId, setBuyerId] = useState(initialBuyerId);
  const [requests, setRequests] = useState(() => sampleRequests.map((request) => ({ ...request })));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emptyMode, setEmptyMode] = useState('ask'); // 'request' (frame 2b) or 'ask' (frame 4)
  const [conversation, setConversation] = useState(EMPTY_CONVERSATION);
  const [drawerCrashed, setDrawerCrashed] = useState(null); // E3: the error, or null
  const [focusRequest, setFocusRequest] = useState(0); // Moves focus into the drawer when it opens from a button
  const [requestsLoading, setRequestsLoading] = useState(true); // Product requests Table loading state
  const [cancelError, setCancelError] = useState(null); // Cancel failed: { id, productId }, or null
  // 'unknown' until the server answers, then 'on' or 'off' (decision 7 of prompt 2j).
  const storage = useRef('unknown');
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  const buyer = findBuyer(buyerId);
  const experience = experienceFor(buyer, EXPERIENCES);
  const accountId = buyer.account_id;

  // Read this visitor's rows on load and when the buyer switches (decision 4 of prompt 2j).
  useEffect(() => {
    let active = true;
    setRequestsLoading(true);
    readRequests(accountId).then(
      (result) => {
        if (!active) return;
        if (result.storage !== 'on') {
          storage.current = 'off';
          return;
        }
        storage.current = 'on';
        setRequests((list) => [
          ...result.rows.map(storedRow),
          ...list.filter((request) => request.account_id !== accountId || !request.stored),
        ]);
      },
      () => {
        // Read fails: show only the 2 sample rows, with no error message.
        if (active) setRequests((list) => list.filter((request) => request.account_id !== accountId || isSample(request)));
      },
    ).finally(() => {
      if (active) setRequestsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [accountId]);

  // Q1: switching buyers clears the conversation.
  const switchBuyer = useCallback((id) => {
    setBuyerId(id);
    setCancelError(null);
    setConversation(EMPTY_CONVERSATION);
    setEmptyMode('ask');
    const url = new URL(window.location.href);
    url.searchParams.set('buyer', id);
    window.history.replaceState(null, '', url.pathname + url.search);
  }, []);

  const openDrawer = useCallback((mode) => {
    if (mode) setEmptyMode(mode);
    setDrawerOpen(true);
    setFocusRequest((value) => value + 1);
  }, []);

  // Frame 5: "Request approval" on a product page.
  const openDrawerForProduct = useCallback((productId) => {
    setConversation((c) => ({
      ...c,
      turns: [...c.turns, frame5Turn(productId)],
      history: [...c.history, { role: 'assistant', content: frame5HistoryText(productId) }],
      flags: { ...c.flags, noteAsked: true },
      subjectProductId: productId,
      clarify: null,
    }));
    setDrawerOpen(true);
    setFocusRequest((value) => value + 1);
  }, []);

  // Saves a product_request. Returns a promise, so the card can show "Sending your request"
  // only when the save takes 1 second or more. A failure rejects, and the app shows frame 12 (save fails).
  // A RequestNotSentError means the server's check did not pass.
  const saveRequest = useCallback(async (record) => {
    const { delayMs = 0, fail = false } = devSaveOptions();
    if (delayMs > 0) await sleep(delayMs);
    if (fail) throw new Error('Save failed');
    if (storage.current !== 'off') {
      const result = await postRequest(record);
      if (result.storage === 'on') {
        if (result.outcome !== 'submitted') throw new RequestNotSentError(result.reason);
        setRequests((list) => [storedRow(result.row), ...list]);
        return result.row;
      }
      storage.current = 'off';
    }
    setRequests((list) => [{ request_id: `req-${Date.now()}`, ...record }, ...list]);
    return record;
  }, []);

  const cancelInSession = (requestId) =>
    setRequests((list) => list.map((request) =>
      request.request_id === requestId ? { ...request, status: REQUEST_STATUS.CANCELED } : request));

  // A stored row is canceled in Supabase. If that fails, the row stays Pending and the Product requests
  // page shows an error Flashbar (decision 6 of prompt 2j). Sample and session rows change in the browser only.
  const cancelRequest = useCallback((requestId) => {
    const row = requestsRef.current.find((request) => request.request_id === requestId);
    if (!row) return;
    setCancelError(null);
    if (!row.stored) {
      cancelInSession(requestId);
      return;
    }
    cancelStoredRequest(requestId).then(
      (result) => {
        if (result.storage !== 'on') {
          cancelInSession(requestId);
          return;
        }
        setRequests((list) => list.map((request) => (request.request_id === requestId ? storedRow(result.row) : request)));
      },
      () => setCancelError({ id: newId('cancel-error'), productId: row.product_id }),
    );
  }, []);

  const myRequests = useMemo(
    () => requests.filter((request) => request.account_id === buyer.account_id),
    [requests, buyer.account_id],
  );

  const value = {
    buyer, experience, products: PRODUCTS, switchBuyer,
    requests, myRequests, saveRequest, cancelRequest, requestsLoading, cancelError, setCancelError,
    drawerOpen, setDrawerOpen, openDrawer, openDrawerForProduct, emptyMode, setEmptyMode, focusRequest,
    conversation, setConversation,
    drawerCrashed, setDrawerCrashed,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
