// The conversation in the drawer: sends buyer turns to /api/agent, applies the stream events,
// and runs the card buttons in the browser (no call to Claude, decision 73).
import { useCallback, useLayoutEffect, useRef } from 'react';
import { findProduct } from '../../shared/catalog.js';
import { findContacts } from '../../shared/contacts.js';
import { COPY, lines } from '../../shared/copy.js';
import { REQUEST_STATUS } from '../../shared/productRequest.js';
import { CHECK } from '../../shared/requestChecks.js';
import { resolveSubmit } from '../../shared/submitRequest.js';
import { streamAgent } from '../agentClient.js';
import { useStore } from '../state/store.jsx';

import { newId } from '../state/ids.js';

// Text of a turn, for the history sent to the agent and for the LiveRegion.
export function turnText(turn) {
  return turn.blocks
    .map((block) => {
      if (block.type === 'text' || block.type === 'stacked') return block.text;
      if (block.type === 'fixed') return fixedText(block);
      if (block.type === 'card') return lines.cardHeading(findProduct(block.productId).name);
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export function fixedText(block) {
  const name = block.productId ? findProduct(block.productId).name : '';
  const joined = (parts) => `${parts.before}${parts.link}${parts.after}`;
  switch (block.key) {
    case 'duplicate': return joined(lines.duplicate(name));
    case 'sent': return joined(lines.sent(name));
    case 'approvedNow': return lines.approvedNow(name);
    case 'requestsOffNotSent': return lines.requestsOffNotSent(name, block.hasContacts);
    case 'blockedNotSent': return lines.blockedNotSent(block.hasContacts);
    case 'cancelled': return COPY.cancelled;
    case 'noteAsk': return COPY.noteAsk;
    case 'cardIntro': return COPY.cardIntro;
    case 'frame5': return lines.frame5(name);
    default: return '';
  }
}

function applyEventToTurn(turn, event) {
  switch (event.type) {
    case 'step': {
      const exists = turn.steps.some((step) => step.id === event.id);
      const steps = exists
        ? turn.steps.map((step) => (step.id === event.id ? { ...step, ...event } : step))
        : [...turn.steps, { ...event, startedAt: Date.now() }];
      return { ...turn, steps };
    }
    case 'text': {
      const blocks = [...turn.blocks];
      const first = blocks[0];
      if (first?.type === 'text') blocks[0] = { ...first, text: first.text + event.delta };
      else blocks.unshift({ type: 'text', id: newId('b'), text: event.delta.trimStart() });
      return { ...turn, blocks };
    }
    case 'stacked':
      return { ...turn, blocks: [...turn.blocks, { type: 'stacked', id: newId('b'), text: event.text, handOff: event.handOff }] };
    case 'products_loading':
      return { ...turn, blocks: [...turn.blocks, { type: 'list', id: newId('b'), ids: null, loadingSince: Date.now() }] };
    case 'products': {
      const blocks = turn.blocks.filter((block) => !(block.type === 'list' && block.ids === null));
      const at = turn.blocks.findIndex((block) => block.type === 'list' && block.ids === null);
      const list = { type: 'list', id: newId('b'), ids: event.ids, moreHref: event.moreHref ?? null };
      if (event.ids.length) blocks.splice(at === -1 ? blocks.length : at, 0, list);
      return { ...turn, blocks };
    }
    case 'contact':
      return { ...turn, blocks: [...turn.blocks, { type: 'contact', id: newId('b'), email: event.email, slack: event.slack }] };
    case 'note_ask':
      return { ...turn, blocks: [...turn.blocks, { type: 'fixed', id: newId('b'), key: 'noteAsk' }] };
    case 'card':
      return {
        ...turn,
        blocks: [
          ...turn.blocks,
          { type: 'fixed', id: newId('b'), key: 'cardIntro' },
          { type: 'card', id: newId('card'), productId: event.productId, note: event.note ?? '', poNumber: event.poNumber ?? '', state: 'open', focusToken: 1 },
        ],
      };
    case 'fixed':
      return { ...turn, blocks: [...turn.blocks, { type: 'fixed', id: newId('b'), key: event.key, productId: event.productId }] };
    case 'prompts':
      return { ...turn, prompts: { alignment: event.alignment, editable: event.editable, items: event.items } };
    default:
      return turn;
  }
}

function applyEventToConversation(conversation, turnId, event) {
  const turns = conversation.turns.map((turn) => (turn.id === turnId ? applyEventToTurn(turn, event) : turn));
  let { flags, subjectProductId, clarify } = conversation;
  if (event.type === 'flags') flags = { ...flags, ...event.set };
  if (event.type === 'note_ask') flags = { ...flags, noteAsked: true };
  if (event.type === 'subject') subjectProductId = event.productId;
  if (event.type === 'clarify') clarify = { turnId, query: event.query, choices: event.choices };
  return { ...conversation, turns, flags, subjectProductId, clarify };
}

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
    const current = ref.current;
    const history = [...current.history, { role: 'user', content: message }];
    const body = {
      buyerId: buyer.id,
      messages: history,
      openRequests: requestsRef.current.filter((r) => r.status === REQUEST_STATUS.PENDING).map((r) => r.product_id),
      flags: current.flags,
      subjectProductId: current.subjectProductId,
      ...(choice ? { choice } : {}),
    };
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
      () => updateTurn(turnId, (turn) => ({
        ...turn,
        status: 'done',
        steps: [],
        blocks: [{ type: 'saveError', id: newId('b'), productId, record }],
      })),
    );
  }, [saveRequest, updateTurn]);

  // "Submit request" on the card (frames 12, 14, 16). Recheck at submit with the current data (decision 78).
  const submitCard = useCallback((card) => {
    const result = resolveSubmit({ card, buyer, experience, requests: requestsRef.current, products });
    const contacts = findContacts(experience.branding_description);
    const hasContacts = Boolean(contacts.email || contacts.slack);
    if (result.outcome === 'not_sent') {
      setCardState(card.id, 'not_sent');
      const blocks = [];
      if (result.reason === CHECK.DUPLICATE) blocks.push({ type: 'fixed', id: newId('b'), key: 'duplicate', productId: card.productId });
      if (result.reason === CHECK.APPROVED) {
        blocks.push({ type: 'fixed', id: newId('b'), key: 'approvedNow', productId: card.productId });
        blocks.push({ type: 'list', id: newId('b'), ids: [card.productId] });
      }
      if (result.reason === CHECK.REQUESTS_OFF || result.reason === CHECK.DECLINED_BLOCKED) {
        const key = result.reason === CHECK.REQUESTS_OFF ? 'requestsOffNotSent' : 'blockedNotSent';
        blocks.push({ type: 'fixed', id: newId('b'), key, productId: card.productId, hasContacts });
        if (hasContacts) blocks.push({ type: 'contact', id: newId('b'), ...contacts });
      }
      addAssistantTurn({ blocks }, `The buyer selected Submit request. The request was not sent: ${result.reason}.`);
      return;
    }
    setCardState(card.id, 'submitted');
    const turnId = addAssistantTurn({}, 'The buyer selected Submit request. The request was sent.');
    save(turnId, result.record, card.productId);
  }, [buyer, experience, products, save]); // eslint-disable-line react-hooks/exhaustive-deps

  // Frame 12 save error: "Try again" saves the same record again, with no new card.
  const retrySave = useCallback((turnId, block) => save(turnId, block.record, block.productId), [save]);

  const cancelCard = useCallback((card) => {
    setCardState(card.id, 'not_sent');
    const prompts = ref.current.flags.alternativesShown
      ? null
      : { alignment: 'vertical', editable: false, items: [{ id: 'show-alternatives', text: COPY.showAlternatives }] };
    update((c) => ({ ...c, subjectProductId: card.productId }));
    addAssistantTurn({ blocks: [{ type: 'fixed', id: newId('b'), key: 'cancelled' }], prompts }, 'The buyer selected Cancel. Nothing was sent.');
  }, [update]); // eslint-disable-line react-hooks/exhaustive-deps

  return { send, retry, chooseClarify, dismissClarify, submitCard, cancelCard, retrySave };
}
