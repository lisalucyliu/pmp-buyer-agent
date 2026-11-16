import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { COPY } from '../../shared/copy.js';
import { requestFormRoute } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';

function FormLink({ productId, children = COPY.alsoRequestForm }) {
  return (
    <Link href={requestFormRoute(productId ?? '')} variant="primary" onFollow={followHandler}>
      {children}
    </Link>
  );
}

const TEXT = {
  connection: COPY.errorConnection,
  E1a: COPY.errorBusy,
  E2: COPY.errorStopped,
};

// Frame 21 (connection, E1a, E1b, E2) and frame 12 (save failed). All copy is fixed in code.
// E1b has no "Try again" (a spend limit stays until next month). Its form link is in the text.
export default function ErrorAlert({ errorType, onRetry, productId, text }) {
  if (errorType === 'E1b') {
    return (
      <Alert type="error">
        {COPY.errorUnavailableBefore}
        <FormLink productId={productId}>{COPY.errorUnavailableLink}</FormLink>
        {COPY.errorUnavailableAfter}
      </Alert>
    );
  }
  return (
    <Alert type="error" action={<Button onClick={onRetry}>{COPY.tryAgain}</Button>}>
      <SpaceBetween size="xxs">
        <Box variant="span">{text ?? TEXT[errorType]}</Box>
        <FormLink productId={productId} />
      </SpaceBetween>
    </Alert>
  );
}

export const errorAlertText = (errorType) =>
  errorType === 'E1b'
    ? `${COPY.errorUnavailableBefore}${COPY.errorUnavailableLink}${COPY.errorUnavailableAfter}`
    : `${TEXT[errorType]} ${COPY.alsoRequestForm}`;
