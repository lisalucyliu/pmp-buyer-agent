// The drawer's conversation rules as plain functions (no React), so the browser and the paid-run
// runner (scripts/run_agent.js) apply events and card buttons the same way.
// Moved from useAgent.js in step 2 with no change in behavior, except one fix: the card result note
// for Claude comes from shared/agentNotes.js (no "declined" or "blocked", decision 16).
import { cardNotes } from '../../shared/agentNotes.js';
import { findProduct } from '../../shared/catalog.js';
import { findContacts } from '../../shared/contacts.js';
import { COPY, lines } from '../../shared/copy.js';
import { REQUEST_STATUS } from '../../shared/productRequest.js';
import { CHECK } from '../../shared/requestChecks.js';
import { resolveSubmit } from '../../shared/submitRequest.js';
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
    case 'noteMissing': return COPY.noteMissing;
    case 'cardIntro': return COPY.cardIntro;
    case 'frame5': return lines.frame5(name);
    default: return '';
  }
}

export function applyEventToTurn(turn, event) {
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

export function applyEventToConversation(conversation, turnId, event) {
  const turns = conversation.turns.map((turn) => (turn.id === turnId ? applyEventToTurn(turn, event) : turn));
  let { flags, subjectProductId, clarify } = conversation;
  if (event.type === 'flags') flags = { ...flags, ...event.set };
  if (event.type === 'note_ask') flags = { ...flags, noteAsked: true };
  if (event.type === 'subject') subjectProductId = event.productId;
  if (event.type === 'clarify') clarify = { turnId, query: event.query, choices: event.choices };
  return { ...conversation, turns, flags, subjectProductId, clarify };
}

// The request body for one buyer message (build plan section 2, "One buyer turn", step 1).
export function requestBody({ conversation, buyer, requests, message, choice = null }) {
  return {
    buyerId: buyer.id,
    messages: [...conversation.history, { role: 'user', content: message }],
    openRequests: requests.filter((r) => r.status === REQUEST_STATUS.PENDING).map((r) => r.product_id),
    flags: conversation.flags,
    subjectProductId: conversation.subjectProductId,
    ...(choice ? { choice } : {}),
  };
}

// "Submit request" on the card (frames 12, 14, 16). Recheck at submit with the current data (decision 78).
// Returns what the browser shows next, the note for Claude's history, and the record to save (if any).
export function submitOutcome({ card, buyer, experience, requests, products }) {
  const result = resolveSubmit({ card, buyer, experience, requests, products });
  if (result.outcome !== 'not_sent') {
    return { cardState: 'submitted', blocks: [], historyNote: cardNotes.sent, record: result.record };
  }
  return { cardState: 'not_sent', blocks: notSentBlocks(result.reason, card.productId, experience), historyNote: cardNotes.notSent(result.reason), record: null };
}

// The blocks for a request that was not sent. The browser check uses them, and so does the save when the
// server's check does not pass (for example a duplicate the browser did not know about).
export function notSentBlocks(reason, productId, experience) {
  const contacts = findContacts(experience.branding_description);
  const hasContacts = Boolean(contacts.email || contacts.slack);
  const blocks = [];
  if (reason === CHECK.DUPLICATE) blocks.push({ type: 'fixed', id: newId('b'), key: 'duplicate', productId });
  if (reason === CHECK.NOTE_MISSING) blocks.push({ type: 'fixed', id: newId('b'), key: 'noteMissing', productId });
  if (reason === CHECK.APPROVED) {
    blocks.push({ type: 'fixed', id: newId('b'), key: 'approvedNow', productId });
    blocks.push({ type: 'list', id: newId('b'), ids: [productId] });
  }
  if (reason === CHECK.REQUESTS_OFF || reason === CHECK.DECLINED_BLOCKED) {
    const key = reason === CHECK.REQUESTS_OFF ? 'requestsOffNotSent' : 'blockedNotSent';
    blocks.push({ type: 'fixed', id: newId('b'), key, productId, hasContacts });
    if (hasContacts) blocks.push({ type: 'contact', id: newId('b'), ...contacts });
  }
  return blocks;
}

// "Cancel" on the card (frame 12). No call to Claude.
export function cancelOutcome({ flags }) {
  const prompts = flags.alternativesShown
    ? null
    : { alignment: 'vertical', editable: false, items: [{ id: 'show-alternatives', text: COPY.showAlternatives }] };
  return {
    cardState: 'not_sent',
    blocks: [{ type: 'fixed', id: newId('b'), key: 'cancelled' }],
    prompts,
    historyNote: cardNotes.cancelled,
  };
}
