import Dialog from '@cloudscape-design/components/dialog';
import SupportPromptGroup from '@cloudscape-design/chat-components/support-prompt-group';

// Frame 7 (decided Nov 14, option A): predefined choices in a dismissible dialog docked above the
// prompt input (Follow-up questions). Cloudscape Dialog: a non-modal interaction, docked above the
// prompt input when a generative AI response needs more information.
// The buyer can still type an own answer in the prompt input.
export default function ClarifyDialog({ clarify, onChoose, onDismiss }) {
  return (
    <div data-testid="clarify-dialog">
      <Dialog
        header="What do you need it for?"
        onDismiss={onDismiss}
        i18nStrings={{ dismissAriaLabel: 'Dismiss choices' }}
      >
        <SupportPromptGroup
          alignment="vertical"
          ariaLabel="Choices"
          items={clarify.choices.map((choice, index) => ({ id: String(index), text: choice.label }))}
          onItemClick={({ detail }) => onChoose(clarify.choices[Number(detail.id)])}
        />
      </Dialog>
    </div>
  );
}
