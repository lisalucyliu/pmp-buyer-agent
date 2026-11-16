// One store that the pages and the drawer both read (build plan section 1, src/state).
// Buyer, the session request list, the drawer state and the conversation.
// Session only: a page reload clears new requests (decision 79, known limit before Supabase).
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import sampleRequests from '../../data/sampleRequests.json';
import { BUYERS, EXPERIENCES, PRODUCTS, experienceFor, findBuyer } from '../../shared/catalog.js';
import { REQUEST_STATUS } from '../../shared/productRequest.js';
import { frame5HistoryText, frame5Turn } from './frame5.js';

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

export function StoreProvider({ children }) {
  const [buyerId, setBuyerId] = useState(initialBuyerId);
  const [requests, setRequests] = useState(() => sampleRequests.map((request) => ({ ...request })));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [emptyMode, setEmptyMode] = useState('ask'); // 'request' (frame 2b) or 'ask' (frame 4)
  const [conversation, setConversation] = useState(EMPTY_CONVERSATION);
  const [drawerCrashed, setDrawerCrashed] = useState(null); // E3: the error, or null
  const [focusRequest, setFocusRequest] = useState(0); // Moves focus into the drawer when it opens from a button

  const buyer = findBuyer(buyerId);
  const experience = experienceFor(buyer, EXPERIENCES);

  // Q1: switching buyers clears the conversation.
  const switchBuyer = useCallback((id) => {
    setBuyerId(id);
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
  // only when the save takes 1 second or more.
  const saveRequest = useCallback((record) => {
    const { delayMs = 0, fail = false } = devSaveOptions();
    return new Promise((resolve, reject) => {
      const finish = () => {
        if (fail) return reject(new Error('Save failed'));
        setRequests((list) => [{ request_id: `req-${Date.now()}`, ...record }, ...list]);
        resolve(record);
      };
      if (delayMs > 0) setTimeout(finish, delayMs);
      else finish();
    });
  }, []);

  const cancelRequest = useCallback((requestId) => {
    setRequests((list) => list.map((request) =>
      request.request_id === requestId ? { ...request, status: REQUEST_STATUS.CANCELED } : request));
  }, []);

  const myRequests = useMemo(
    () => requests.filter((request) => request.account_id === buyer.account_id),
    [requests, buyer.account_id],
  );

  const value = {
    buyer, experience, products: PRODUCTS, switchBuyer,
    requests, myRequests, saveRequest, cancelRequest,
    drawerOpen, setDrawerOpen, openDrawer, openDrawerForProduct, emptyMode, setEmptyMode, focusRequest,
    conversation, setConversation,
    drawerCrashed, setDrawerCrashed,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
