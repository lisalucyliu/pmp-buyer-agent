import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import { COPY } from '../../shared/copy.js';

// Row 5 contact bubble. One pair for each detail code found in the branding description.
export default function ContactBubble({ email, slack }) {
  const items = [];
  if (email) {
    items.push({
      label: COPY.contactEmail,
      value: (
        <CopyToClipboard
          variant="inline"
          textToCopy={email}
          copyButtonAriaLabel={COPY.copyEmailAriaLabel}
          copySuccessText={COPY.emailCopied}
          copyErrorText={COPY.emailCopyFailed}
        />
      ),
    });
  }
  if (slack) items.push({ label: COPY.contactSlack, value: slack });
  return <KeyValuePairs columns={1} items={items} ariaLabel="Administrator contact details" />;
}
