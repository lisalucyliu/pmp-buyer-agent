import { useEffect, useRef } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { findProduct, vendorDiffers } from '../../shared/catalog.js';
import { COPY, lines } from '../../shared/copy.js';

// Focus tokens already handled, so a card that mounts again (drawer closed and opened) doesn't take focus.
const handled = new Map();

// Frame 11: one-time authorization card (User authorized actions). Not a dialog: no dialog role,
// no focus trap. Focus moves to the card heading, never to the approve button. It resolves at once,
// with no loading state, to "Submitted" or "Not sent" in a Status indicator.
export default function ConfirmCard({ card, onSubmit, onCancel }) {
  const product = findProduct(card.productId);
  const headingRef = useRef(null);
  const headingId = `${card.id}-heading`;

  useEffect(() => {
    if (handled.get(card.id) === card.focusToken) return;
    handled.set(card.id, card.focusToken);
    headingRef.current?.focus();
  }, [card.id, card.focusToken]);

  const details = [];
  if (vendorDiffers(product)) details.push({ label: COPY.cardVendor, value: product.vendor });
  if (card.note) details.push({ label: COPY.cardNote, value: card.note });
  if (card.poNumber) details.push({ label: COPY.cardPoNumber, value: card.poNumber });

  return (
    <section aria-labelledby={headingId} data-testid="confirm-card">
      <SpaceBetween size="s">
        <div ref={headingRef} tabIndex={-1} id={headingId} data-testid="card-heading">
          <Header variant="h3" description={COPY.cardDescription}>
            {lines.cardHeading(product.name)}
          </Header>
        </div>
        {details.length > 0 && <KeyValuePairs columns={1} items={details} />}
        {card.state === 'open' ? (
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => onCancel(card)}>{COPY.cancel}</Button>
              <Button variant="primary" onClick={() => onSubmit(card)}>
                {COPY.submitRequest}
              </Button>
            </SpaceBetween>
          </Box>
        ) : card.state === 'submitted' ? (
          <StatusIndicator type="success">{COPY.submitted}</StatusIndicator>
        ) : (
          <StatusIndicator type="stopped">{COPY.notSent}</StatusIndicator>
        )}
      </SpaceBetween>
    </section>
  );
}
