import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Steps from '@cloudscape-design/components/steps';
import { useDelayed } from './useDelayed.js';

const STATUS_LABEL = { loading: 'In progress', success: 'Success', error: 'Error' };

function StepList({ steps }) {
  return (
    <Steps
      steps={steps.map((step) => ({
        status: step.status,
        statusIconAriaLabel: STATUS_LABEL[step.status],
        header: step.text,
      }))}
    />
  );
}

// Progressive steps: while working, a loading status on the last step (shown only after 1 second).
// When done, the steps go in an expandable section, collapsed by default.
// A single-step line with no header (frame 14, "Sent your request") shows the step only.
export default function StepLine({ steps }) {
  const loading = steps.some((step) => step.status === 'loading');
  const since = steps.find((step) => step.status === 'loading')?.startedAt;
  const showLoading = useDelayed(loading, since);
  if (!steps.length) return null;
  if (loading) return showLoading ? <StepList steps={steps} /> : null;
  const failed = steps.some((step) => step.status === 'error');
  const header = steps[0].header;
  if (failed || !header) return <StepList steps={steps} />;
  return (
    <ExpandableSection headerText={header} defaultExpanded={false}>
      <StepList steps={steps} />
    </ExpandableSection>
  );
}
