import { COPY, lines } from '../../shared/copy.js';
import { findProduct } from '../../shared/catalog.js';
import { newId } from './ids.js';

// Frame 5: the drawer opened from "Request approval". Code writes the bubble, with no Claude call,
// and adds it to the history as an assistant message so the agent has the context.
export function frame5Turn(productId) {
  return {
    kind: 'assistant',
    id: newId('t'),
    status: 'done',
    startedAt: Date.now(),
    steps: [],
    blocks: [{ type: 'fixed', id: newId('b'), key: 'frame5', productId }],
    prompts: {
      alignment: 'vertical',
      editable: false,
      items: [
        { id: 'continue-without-note', text: COPY.continueWithoutNote },
        { id: 'show-alternatives', text: COPY.showAlternatives },
      ],
    },
  };
}

export const frame5HistoryText = (productId) => lines.frame5(findProduct(productId).name);
