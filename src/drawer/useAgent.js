// The conversation in the drawer: sends buyer turns to /api/agent, applies the stream events,
// and runs the card buttons in the browser (no call to Claude, decision 73).
import { useCallback, useLayoutEffect, useRef } from 'react';
import { streamAgent } from '../agentClient.js';
import { RequestNotSentError, useStore } from '../state/store.jsx';
import { COPY } from '../../shared/copy.js';
import { newId } from '../state/ids.js';
import { applyEventToConversation, cancelOutcome, notSentBlocks, requestBody, submitOutcome, turnText } from './conversationLogic.js';

// Kept as exports here, because other drawer files import them from this module.
export { fixedText, turnText } from './conversationLogic.js';

export function useAgent() {
  const store = useStore();
  const { buyer, experience, products, myRequests, saveRequest, conversation, setConversation } = store;
  const ref = useRef(conversation);
  useLayoutEffect(() => {
    ref.current = conversation;
  }, [conversation]);
  const requestsRef = useRef(myRequests);
  useLayoutEffect(() => {
    requestsRef.current = myRequests;
  }, [myRequests]);

  const update = useCallback((fn) => {
    setConversation((current) => {
      const next = fn(current);
      ref.current = next;
      return next;
    });
  }, [setConversation]);

  const updateTurn = useCallback((turnId, fn) => {
    update((c) => ({ ...c, turns: c.turns.map((turn) => (turn.id === turnId ? fn(turn) : turn)) }));
  }, [update]);

  const runTurn = useCallback(async (turnId, body) => {
    const buyerAtStart = body.buyerId;
    const { errorType } = await streamAgent(body, (event) => {
      update((c) => applyEventToConversation(c, turnId, event));
    });
    if (buyerAtStart !== store.buyer.id && !ref.current.turns.some((t) => t.id === turnId)) return;
    update((c) => {
      const turn = c.turns.find((t) => t.id === turnId);
      if (!turn) return c;
      if (errorType) {
        const steps = turn.steps.map((step) =>
          step.status === 'loading' ? { ...step, status: 'error', text: COPY.errorSearchStep } : step);
        // E2: remove the partial text and stacked bubbles. The bubble shows the Alert only (decided Nov 15).
        const failed = errorType === 'E2'
          ? { ...turn, steps: [], blocks: [], prompts: null }
          : { ...turn, steps, prompts: null };
        const clarify = c.clarify?.turnId === turnId ? null : c.clarify;
        return { ...c, clarify, turns: c.turns.map((t) => (t.id === turnId ? { ...failed, status: 'error', errorType } : t)) };
      }
      const done = { ...turn, status: 'done' };
      const history = [...c.history, { role: 'assistant', content: turnText(done) }];
      return { ...c, history, turns: c.turns.map((t) => (t.id === turnId ? done : t)) };
    });
  }, [store.buyer.id, update]);

  const send = useCallback((text, { choice = null } = {}) => {
    const message = text.trim();
    if (!message) return;
    const body = requestBody({ conversation: ref.current, buyer, requests: requestsRef.current, message, choice });
    const history = body.messages;
    const turnId = newId('t');
    update((c) => ({
      ...c,
      history,
      clarify: null,
      turns: [
        ...c.turns,
        { kind: 'user', id: newId('u'), text: message },
        { kind: 'assistant', id: turnId, status: 'streaming', startedAt: Date.now(), steps: [], blocks: [], prompts: null, request: body },
      ],
    }));
    runTurn(turnId, body);
  }, [buyer.id, runTurn, update]);

  // "Try again" (frames 8c, 21). Sends the same prompt again. The new response replaces the Alert (E4).
  const retry = useCallback((turnId) => {
    const turn = ref.current.turns.find((t) => t.id === turnId);
    if (!turn?.request) return;
    updateTurn(turnId, () => ({ ...turn, status: 'streaming', startedAt: Date.now(), steps: [], blocks: [], prompts: null, errorType: null }));
    runTurn(turnId, turn.request);
  }, [runTurn, updateTurn]);

  const chooseClarify = useCallback((choice) => send(choice.label, { choice }), [send]);
  const dismissClarify = useCallback(() => update((c) => ({ ...c, clarify: null })), [update]);

  const setCardState = (cardId, state) =>
    update((c) => ({
      ...c,
      turns: c.turns.map((turn) => ({
        ...turn,
        blocks: turn.blocks?.map((block) => (block.id === cardId ? { ...block, state, focusToken: block.focusToken + 1 } : block)),
      })),
    }));

  const addAssistantTurn = (turn, historyNote) => {
    const full = { kind: 'assistant', id: newId('t'), status: 'done', startedAt: Date.now(), steps: [], blocks: [], prompts: null, ...turn };
    update((c) => ({
      ...c,
      turns: [...c.turns, full],
      history: [...c.history, ...(historyNote ? [{ role: 'tool_result', content: historyNote }] : []), { role: 'assistant', content: turnText(full) }],
    }));
    return full.id;
  };

  const save = useCallback((turnId, record, productId) => {
    const sendStep = { id: 'send', status: 'loading', text: COPY.sending, startedAt: Date.now() };
    updateTurn(turnId, (turn) => ({ ...turn, status: 'streaming', steps: [sendStep], blocks: [] }));
    saveRequest(record).then(
      () => updateTurn(turnId, (turn) => ({
        ...turn,
        status: 'done',
        steps: [{ ...sendStep, status: 'success', text: COPY.sent }],
        blocks: [{ type: 'fixed', id: newId('b'), key: 'sent', productId }],
      })),
      (error) => updateTurn(turnId, (turn) => ({
        ...turn,
        status: 'done',
        steps: [],
        // The server's check did not pass: the same result as the browser's check (frames 13, 16).
        blocks: error instanceof RequestNotSentError
          ? notSentBlocks(error.reason, productId, experience)
          : [{ type: 'saveError', id: newId('b'), productId, record }],
      })),
    );
  }, [experience, saveRequest, updateTurn]);

  // "Submit request" on the card (frames 12, 14, 16). Recheck at submit with the current data (decision 78).
  const submitCard = useCallback((card) => {
    const outcome = submitOutcome({ card, buyer, experience, requests: requestsRef.current, products });
    setCardState(card.id, outcome.cardState);
    if (!outcome.record) {
      addAssistantTurn({ blocks: outcome.blocks }, outcome.historyNote);
      return;
    }
    const turnId = addAssistantTurn({}, outcome.historyNote);
    save(turnId, outcome.record, card.productId);
  }, [buyer, experience, products, save]); // eslint-disable-line react-hooks/exhaustive-deps

  // Frame 12 save error: "Try again" saves the same record again, with no new card.
  const retrySave = useCallback((turnId, block) => save(turnId, block.record, block.productId), [save]);

  const cancelCard = useCallback((card) => {
    const outcome = cancelOutcome({ flags: ref.current.flags });
    setCardState(card.id, outcome.cardState);
    update((c) => ({ ...c, subjectProductId: card.productId }));
    addAssistantTurn({ blocks: outcome.blocks, prompts: outcome.prompts }, outcome.historyNote);
  }, [update]); // eslint-disable-line react-hooks/exhaustive-deps

  return { send, retry, chooseClarify, dismissClarify, submitCard, cancelCard, retrySave };
}
