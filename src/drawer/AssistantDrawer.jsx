import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Drawer from '@cloudscape-design/components/drawer';
import ErrorBoundary from '@cloudscape-design/components/error-boundary';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import LiveRegion from '@cloudscape-design/components/live-region';
import PromptInput from '@cloudscape-design/components/prompt-input';
import SpaceBetween from '@cloudscape-design/components/space-between';
import SupportPromptGroup from '@cloudscape-design/chat-components/support-prompt-group';
import { AWS_RESPONSIBLE_AI_POLICY_URL, COPY } from '../../shared/copy.js';
import { useStore } from '../state/store.jsx';
import ClarifyDialog from './ClarifyDialog.jsx';
import DrawerErrorFallback from './DrawerErrorFallback.jsx';
import { errorAlertText } from './ErrorAlert.jsx';
import Messages from './Messages.jsx';
import { turnText, useAgent } from './useAgent.js';

// Dev-only E3 switch (Q7). In `vite build`, import.meta.env.DEV is false, so this import is removed.
const DevCrash = import.meta.env.DEV ? lazy(() => import('./DevCrash.jsx')) : null;

export const DRAWER_BOUNDARY_ID = 'assistant-drawer';

function EmptyState({ mode, requestsOn, onPrompt }) {
  if (mode === 'request' && requestsOn) {
    // Frame 2b: no support prompts (the buyer must name the product).
    return (
      <Box textAlign="center" padding={{ vertical: 'xxl', horizontal: 'm' }} data-testid="empty-state">
        <SpaceBetween size="xs">
          <Box variant="h3" tagOverride="p">{COPY.emptyRequestHeading}</Box>
          <Box variant="p" color="text-body-secondary">{COPY.emptyRequestDescription}</Box>
        </SpaceBetween>
      </Box>
    );
  }
  // Frame 4, with the Sam variant description.
  return (
    <Box textAlign="center" padding={{ vertical: 'xxl', horizontal: 'm' }} data-testid="empty-state">
      <SpaceBetween size="l">
        <SpaceBetween size="xs">
          <Box variant="h3" tagOverride="p">{COPY.emptyAskHeading}</Box>
          <Box variant="p" color="text-body-secondary">
            {requestsOn ? COPY.emptyAskDescription : COPY.emptyAskDescriptionRequestsOff}
          </Box>
        </SpaceBetween>
        <SupportPromptGroup
          alignment="horizontal"
          ariaLabel="Suggested prompts"
          items={[COPY.promptIsApproved, COPY.promptFindApproved].map((text, i) => ({
            id: `start-${i}`,
            text,
            iconName: 'edit',
            iconPosition: 'right',
            ariaLabel: `Edit prompt: ${text}`,
          }))}
          onItemClick={({ detail }) => onPrompt(detail.id === 'start-0' ? COPY.promptIsApproved : COPY.promptFindApproved)}
        />
      </SpaceBetween>
    </Box>
  );
}

// The drawer's own scroll area (the App layout drawer content container). It is returned also when the
// conversation is still too short to scroll. Never the page: with a short conversation, the old code fell
// back to document.scrollingElement, and the auto-scroll moved the product page down about 2300 px.
function scrollParent(node) {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
}

// The conversation. Inside the section-level Error boundary.
function Conversation({ agent, onEditablePrompt }) {
  const { conversation, emptyMode, experience } = useStore();
  const regionRef = useRef(null);
  const nearBottom = useRef(true);

  // Generative AI chat: don't auto-scroll while the buyer reads older messages.
  useEffect(() => {
    const scroller = scrollParent(regionRef.current);
    if (!scroller) return undefined;
    const onScroll = () => {
      nearBottom.current = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  });
  useLayoutEffect(() => {
    if (!nearBottom.current) return;
    const scroller = scrollParent(regionRef.current);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [conversation.turns]);

  return (
    <div role="region" aria-label={COPY.chatRegionLabel} ref={regionRef} data-testid="chat">
      {DevCrash && (
        <Suspense fallback={null}>
          <DevCrash />
        </Suspense>
      )}
      {conversation.turns.length === 0 ? (
        <EmptyState mode={emptyMode} requestsOn={experience.requests_enabled} onPrompt={onEditablePrompt} />
      ) : (
        <Messages agent={agent} onEditablePrompt={onEditablePrompt} />
      )}
    </div>
  );
}

// Each new bubble is announced in a hidden LiveRegion (Generative AI chat).
function useAnnouncement(turns) {
  const last = [...turns].reverse().find((turn) => turn.kind === 'assistant' && turn.status !== 'streaming');
  if (!last) return '';
  if (last.status === 'error') return errorAlertText(last.errorType);
  return turnText(last);
}

export default function AssistantDrawer() {
  const store = useStore();
  const { conversation, focusRequest, drawerCrashed, setDrawerCrashed } = store;
  const agent = useAgent();
  const [value, setValue] = useState('');
  const promptRef = useRef(null);
  const streaming = conversation.turns.some((turn) => turn.status === 'streaming');
  const announcement = useAnnouncement(conversation.turns);

  useEffect(() => {
    // preventScroll: focus moves to the prompt input, and the page never scrolls to show it. (The page
    // jump on "Request approval" came from the auto-scroll, see scrollParent. This is an extra guard.)
    if (focusRequest) promptRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  const fillPrompt = (text) => {
    setValue(text);
    promptRef.current?.focus({ preventScroll: true });
  };

  const submit = () => {
    if (streaming || !value.trim()) return;
    agent.send(value);
    setValue('');
  };

  return (
    <Drawer
      header={<Header variant="h2">{COPY.drawerTitle}</Header>}
      footer={
        drawerCrashed ? null : (
          <ErrorBoundary errorBoundaryId="assistant-footer" onError={({ error }) => setDrawerCrashed(error)} renderFallback={() => null}>
            <SpaceBetween size="s">
            {conversation.clarify && (
              <ClarifyDialog clarify={conversation.clarify} onChoose={agent.chooseClarify} onDismiss={agent.dismissClarify} />
            )}
            <FormField
              stretch
              constraintText={
                <>
                  {COPY.constraintBefore}
                  <Link href={AWS_RESPONSIBLE_AI_POLICY_URL} external variant="primary" fontSize="inherit">
                    {COPY.constraintLink}
                  </Link>
                  {COPY.constraintAfter}
                </>
              }
            >
              <PromptInput
                ref={promptRef}
                value={value}
                onChange={({ detail }) => setValue(detail.value)}
                onAction={submit}
                placeholder={COPY.promptPlaceholder}
                ariaLabel={COPY.promptPlaceholder}
                actionButtonIconName="send"
                actionButtonAriaLabel={COPY.sendAriaLabel}
                disableActionButton={streaming || !value.trim()}
                minRows={1}
                maxRows={6}
              />
            </FormField>
            </SpaceBetween>
          </ErrorBoundary>
        )
      }
    >
      {drawerCrashed ? (
        <DrawerErrorFallback message={drawerCrashed.message} />
      ) : (
        <ErrorBoundary
          errorBoundaryId={DRAWER_BOUNDARY_ID}
          onError={({ error }) => setDrawerCrashed(error)}
          renderFallback={() => <DrawerErrorFallback message="" />}
        >
          <Conversation agent={agent} onEditablePrompt={fillPrompt} />
        </ErrorBoundary>
      )}
      <LiveRegion hidden>{announcement}</LiveRegion>
    </Drawer>
  );
}
