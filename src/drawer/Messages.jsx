import { Fragment } from 'react';
import Box from '@cloudscape-design/components/box';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Avatar from '@cloudscape-design/chat-components/avatar';
import ChatBubble from '@cloudscape-design/chat-components/chat-bubble';
import SupportPromptGroup from '@cloudscape-design/chat-components/support-prompt-group';
import { findProduct } from '../../shared/catalog.js';
import { COPY, lines } from '../../shared/copy.js';
import { ROUTES } from '../../shared/productRoutes.js';
import ProductList from '../components/ProductList.jsx';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';
import ConfirmCard from './ConfirmCard.jsx';
import ContactBubble from './ContactBubble.jsx';
import ErrorAlert from './ErrorAlert.jsx';
import StepLine from './StepLine.jsx';
import { fixedText } from './useAgent.js';
import { useDelayed } from './useDelayed.js';

const assistantAvatar = (loading) => (
  <Avatar color="gen-ai" iconName="gen-ai" ariaLabel={COPY.assistantName} tooltipText={COPY.assistantName} loading={loading} />
);

// Claude's text shows as plain text, never markdown (decision 110). React escapes it, and
// white-space: pre-line keeps its line breaks. A "**bold**" or "# heading" shows as typed.
function PlainText({ text }) {
  return <div style={{ whiteSpace: 'pre-line' }} data-testid="assistant-text">{text}</div>;
}

function LinkedLine({ parts }) {
  return (
    <span>
      {parts.before}
      <Link href={ROUTES.productRequests} variant="primary" onFollow={followHandler}>
        {parts.link}
      </Link>
      {parts.after}
    </span>
  );
}

function FixedLine({ block }) {
  const name = block.productId ? findProduct(block.productId).name : '';
  if (block.key === 'duplicate') return <LinkedLine parts={lines.duplicate(name)} />;
  if (block.key === 'sent') return <LinkedLine parts={lines.sent(name)} />;
  return <span>{fixedText(block)}</span>;
}

function ListBlock({ block, experienceId }) {
  const loading = block.ids === null;
  const showLoading = useDelayed(loading, block.loadingSince);
  if (loading) return showLoading ? <Box color="text-status-inactive">{COPY.loadingProducts}</Box> : null;
  const products = block.ids.map((id) => findProduct(id));
  return (
    <SpaceBetween size="xs">
      <ProductList products={products} experienceId={experienceId} ariaLabel="Products" />
      {block.moreHref && (
        <Link href={block.moreHref} variant="primary" onFollow={followHandler}>
          See all approved products in this category
        </Link>
      )}
    </SpaceBetween>
  );
}

function blockContent(block, ctx) {
  switch (block.type) {
    case 'text':
      return <PlainText text={block.text} />;
    case 'stacked':
      return <PlainText text={block.text} />;
    case 'fixed':
      return <FixedLine block={block} />;
    case 'list':
      return <ListBlock block={block} experienceId={ctx.experienceId} />;
    case 'contact':
      return <ContactBubble email={block.email} slack={block.slack} />;
    case 'card':
      return <ConfirmCard card={block} onSubmit={ctx.agent.submitCard} onCancel={ctx.agent.cancelCard} />;
    case 'saveError':
      return (
        <ErrorAlert
          errorType="save"
          text={lines.saveFailed(findProduct(block.productId).name)}
          productId={block.productId}
          onRetry={() => ctx.agent.retrySave(ctx.turn.id, block)}
        />
      );
    default:
      return null;
  }
}

function AssistantTurn({ turn, index, isLast, agent, onEditablePrompt }) {
  const { experience } = useStore();
  const streaming = turn.status === 'streaming';
  const hasContent = turn.blocks.length > 0;
  // Frame 8a: the loading avatar and "Generating a response", next to the search step, after 1 second.
  const showGenerating = useDelayed(streaming && !hasContent, turn.startedAt);
  const avatarLoading = useDelayed(streaming && !hasContent, turn.startedAt);
  const ctx = { experienceId: experience.id, agent, turn };
  const loadingList = turn.blocks.find((block) => block.type === 'list' && block.ids === null);
  const showListLoading = useDelayed(Boolean(loadingList), loadingList?.loadingSince);

  const bubbles = turn.blocks
    .filter((block) => !(block.type === 'list' && block.ids === null && !showListLoading))
    .map((block) => ({ key: block.id, content: blockContent(block, ctx), loadingBar: block.type === 'list' && block.ids === null }));
  if (turn.status === 'error') {
    bubbles.push({
      key: 'error',
      content: <ErrorAlert errorType={turn.errorType} productId={turn.request?.subjectProductId} onRetry={() => agent.retry(turn.id)} />,
    });
  }

  const steps = <StepLine steps={turn.steps} />;
  const first = bubbles[0];
  const showPrompts = isLast && turn.status === 'done' && turn.prompts?.items?.length;

  return (
    <>
      {first ? (
        bubbles.map((bubble, i) => (
          <ChatBubble
            key={bubble.key}
            type="incoming"
            avatar={assistantAvatar(i === 0 && avatarLoading)}
            hideAvatar={i > 0}
            showLoadingBar={bubble.loadingBar}
            ariaLabel={`${COPY.assistantName}, response ${index}${i > 0 ? `, part ${i + 1}` : ''}`}
          >
            {i === 0 ? (
              <SpaceBetween size="s">
                {steps}
                {bubble.content}
              </SpaceBetween>
            ) : (
              bubble.content
            )}
          </ChatBubble>
        ))
      ) : (
        (showGenerating || turn.steps.some((step) => step.status !== 'loading')) && (
          <ChatBubble type="incoming" avatar={assistantAvatar(avatarLoading)} ariaLabel={`${COPY.assistantName}, response ${index}`}>
            <SpaceBetween size="s">
              {steps}
              {showGenerating && <Box color="text-status-inactive">{COPY.generating}</Box>}
            </SpaceBetween>
          </ChatBubble>
        )
      )}
      {showPrompts ? (
        <div data-testid="support-prompts">
          <SupportPromptGroup
            alignment={turn.prompts.alignment}
            ariaLabel="Suggested prompts"
            items={turn.prompts.items.map((item) => ({
              id: item.id,
              text: item.text,
              ...(turn.prompts.editable ? { iconName: 'edit', iconPosition: 'right', ariaLabel: `Edit prompt: ${item.text}` } : {}),
            }))}
            onItemClick={({ detail }) => {
              const item = turn.prompts.items.find((p) => p.id === detail.id);
              if (turn.prompts.editable) onEditablePrompt(item.text);
              else agent.send(item.text);
            }}
          />
        </div>
      ) : null}
    </>
  );
}

export default function Messages({ agent, onEditablePrompt }) {
  const { buyer, conversation } = useStore();
  let assistantIndex = 0;
  let userIndex = 0;
  const lastId = conversation.turns[conversation.turns.length - 1]?.id;
  return (
    <SpaceBetween size="m">
      {conversation.turns.map((turn) => (
        <Fragment key={turn.id}>
          {turn.kind === 'user' ? (
            <ChatBubble
              type="outgoing"
              avatar={<Avatar initials={buyer.initials} ariaLabel={buyer.name} tooltipText={buyer.name} />}
              ariaLabel={`${buyer.name}, message ${(userIndex += 1)}`}
            >
              <PlainText text={turn.text} />
            </ChatBubble>
          ) : (
            <AssistantTurn
              turn={turn}
              index={(assistantIndex += 1)}
              isLast={turn.id === lastId}
              agent={agent}
              onEditablePrompt={onEditablePrompt}
            />
          )}
        </Fragment>
      ))}
    </SpaceBetween>
  );
}
