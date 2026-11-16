import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Header from '@cloudscape-design/components/header';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { COPY } from '../../shared/copy.js';
import { discoverRoute } from '../../shared/productRoutes.js';
import ApprovedBadge from '../components/ApprovedBadge.jsx';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';

// Frame 1. Layout from Lisa's 2023 buyer page (private-marketplace-prototype, my-private-marketplace.html).
export default function MyPrivateMarketplace() {
  const { experience, openDrawer } = useStore();
  const requestsOn = experience.requests_enabled;

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              {/* Hidden for Sam (decided Nov 14). The trigger bar icon still opens the drawer. */}
              {requestsOn && (
                <Button iconName="gen-ai" onClick={() => openDrawer('request')}>
                  {COPY.requestProduct}
                </Button>
              )}
              <Button variant="primary" href={discoverRoute({ approvedOnly: true })} onFollow={followHandler}>
                {COPY.explorePmp}
              </Button>
            </SpaceBetween>
          }
        >
          My Private Marketplace
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">{`Welcome to ${experience.branding_name}`}</Header>}>
          <SpaceBetween size="m">
            <Box variant="p">{experience.branding_description}</Box>
            {requestsOn ? (
              <StatusIndicator type="success">{COPY.requestsEnabled}</StatusIndicator>
            ) : (
              <StatusIndicator type="stopped">{COPY.requestsDisabled}</StatusIndicator>
            )}
          </SpaceBetween>
        </Container>

        <ExpandableSection variant="container" headerText="What is Private Marketplace?">
          <Box variant="p">
            Private Marketplace controls which AWS Marketplace products your organization can buy. Your
            administrators choose the approved products. You can find and buy them here, knowing that they
            meet your organization&apos;s policies.
          </Box>
        </ExpandableSection>

        <Container header={<Header variant="h2">Preview</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">If a product is approved for purchase in your Private Marketplace, you see this badge:</Box>
            <div>
              <ApprovedBadge />
            </div>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
