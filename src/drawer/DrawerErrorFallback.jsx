import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { COPY } from '../../shared/copy.js';
import { requestFormRoute } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';

// Frame 22, E3 (drawer fails to load). Replaces the drawer content only. The header and close button stay.
// No contact line (decided Nov 15, logged deviation D3): the real console would tell the buyer to contact
// AWS Support. This prototype doesn't, because it is a prototype.
export default function DrawerErrorFallback({ message }) {
  return (
    <Alert
      type="error"
      action={<Button onClick={() => window.location.reload()}>{COPY.reloadPage}</Button>}
    >
      <SpaceBetween size="s">
        <Box variant="span">
          {COPY.drawerCrashBefore}
          <Link href={requestFormRoute()} variant="primary" onFollow={followHandler}>
            {COPY.drawerCrashLink}
          </Link>
          {COPY.drawerCrashAfter}
        </Box>
        {message && (
          <ExpandableSection headerText={COPY.errorDetails} defaultExpanded={false}>
            <CopyToClipboard
              variant="inline"
              textToCopy={message}
              copyButtonAriaLabel="Copy error details"
              copySuccessText={COPY.errorDetailsCopied}
              copyErrorText={COPY.errorDetailsCopyFailed}
            />
          </ExpandableSection>
        )}
      </SpaceBetween>
    </Alert>
  );
}
