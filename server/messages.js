// Checks the request body from the browser and builds the Claude messages from it.
// The browser sends the history as the buyer saw it (src/drawer/conversationLogic.js):
//   { role: 'user' | 'assistant', content }   what the buyer typed, and the text the buyer saw
//   { role: 'tool_result', content }          the card result note (build plan section 2, card step 7)
// The server looks up the buyer and Private Marketplace from data/, never from the browser text.
import { PRODUCTS, experienceFor, findBuyer, findProduct } from '../shared/catalog.js';
import { hasContacts } from '../shared/contacts.js';

export const MAX_HISTORY = 80;
export const MAX_TEXT = 4000;
const ROLES = new Set(['user', 'assistant', 'tool_result']);

// Text the app writes for Claude (not shown to the buyer). Drafts, Lisa to approve
// (docs/prompt-changes.md, "App notes").
export const APP_NOTES = {
  // The conversation starts with the frame 5 bubble (an assistant message), but Claude's first message
  // must be from the user.
  openedFromProductPage: 'App note: The buyer selected Request approval on a product page.',
  // The product the conversation is about, when code knows it (frame 5, a card, alternatives).
  // So Claude can call submit_request or alternatives_for without a new search.
  subject: (product) => `App note: This conversation is about ${product.name} (product_id ${product.product_id}).`,
  // The card result (build plan section 2, card step 7).
  cardResult: (text) => `App note: ${text}`,
  // On each buyer message (Lisa's answers, Nov 16, step 2 part 1 report, Q2), so Claude can pick the
  // frame 19 hand-off ending with no tool call. Never the details themselves (decision 87).
  contactDetails: (yes) => `App note: Contact details: ${yes ? 'yes' : 'no'}.`,
};

const isText = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_TEXT;

// Returns { error } or { buyer, experience, requests, flags, history, subject, choice }.
export function readBody(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' };
  const buyer = findBuyer(body.buyerId);
  if (!buyer) return { error: 'Unknown buyer' };
  const { messages } = body;
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_HISTORY) return { error: 'Invalid history' };
  const valid = (m) =>
    ROLES.has(m?.role) && typeof m.content === 'string' && m.content.length <= MAX_TEXT && (m.role !== 'user' || isText(m.content));
  if (!messages.every(valid)) return { error: 'Invalid history' };
  if (messages.at(-1).role !== 'user') return { error: 'The last message must be from the buyer' };
  // An assistant turn with no text (for example the turn after "Submit request", whose sent line arrives
  // after its history entry is made) adds nothing for Claude, so it is left out.
  const history = messages.filter((m) => m.content.trim());

  const openRequests = body.openRequests ?? [];
  if (!Array.isArray(openRequests) || !openRequests.every((id) => findProduct(id))) return { error: 'Invalid open requests' };
  const subject = body.subjectProductId ? findProduct(body.subjectProductId) : null;
  if (body.subjectProductId && !subject) return { error: 'Unknown product' };

  const flags = {};
  for (const [key, value] of Object.entries(body.flags ?? {})) flags[key] = value === true;

  let choice = null;
  if (body.choice) {
    const { label, categories } = body.choice;
    const known = new Set(PRODUCTS.map((p) => p.category));
    if (!isText(label) || !Array.isArray(categories) || !categories.every((c) => known.has(c))) return { error: 'Invalid choice' };
    choice = { label, categories };
  }

  const requests = openRequests.map((productId) => ({ account_id: buyer.account_id, product_id: productId, status: 'Pending' }));
  return { buyer, experience: experienceFor(buyer), requests, flags, history, subject, choice };
}

// The Claude messages for this turn. Text only: earlier tool calls are not in the browser history.
export function buildMessages({ history, subject, experience }) {
  const contactNote = APP_NOTES.contactDetails(hasContacts(experience.branding_description));
  const messages = [];
  let notes = [];
  const pushUser = (text) => {
    messages.push({ role: 'user', content: [...notes.map((note) => ({ type: 'text', text: note })), { type: 'text', text }] });
    notes = [];
  };
  history.forEach((entry, index) => {
    if (entry.role === 'tool_result') {
      notes.push(APP_NOTES.cardResult(entry.content));
      return;
    }
    if (entry.role === 'assistant') {
      if (messages.length === 0) messages.push({ role: 'user', content: [{ type: 'text', text: APP_NOTES.openedFromProductPage }] });
      messages.push({ role: 'assistant', content: [{ type: 'text', text: entry.content }] });
      return;
    }
    const isLast = index === history.length - 1;
    notes.push(contactNote);
    if (isLast && subject) notes.push(APP_NOTES.subject(subject));
    pushUser(entry.content);
  });
  return messages;
}
