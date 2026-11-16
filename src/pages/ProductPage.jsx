import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { findProduct, vendorDiffers } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { PAGE_CASE, productPageCase } from '../../shared/productPageCase.js';
import { ROUTES } from '../../shared/productRoutes.js';
import ApprovedBadge from '../components/ApprovedBadge.jsx';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';

function CaseAlert({ pageCase }) {
  if (pageCase === PAGE_CASE.APPROVED) return null;
  if (pageCase === PAGE_CASE.PENDING) {
    return (
      <Alert type="info">
        {COPY.alertPendingBefore}
        <Link href={ROUTES.productRequests} variant="primary" onFollow={followHandler}>
          {COPY.productRequests}
        </Link>
        {COPY.alertPendingAfter}
      </Alert>
    );
  }
  const text = {
    [PAGE_CASE.REQUESTABLE]: COPY.alertNotApproved,
    [PAGE_CASE.REQUESTS_OFF]: COPY.alertRequestsOff,
    [PAGE_CASE.BLOCKED]: COPY.alertBlocked,
  }[pageCase];
  return <Alert type="info">{text}</Alert>;
}

// Frame 3, all 5 cases. The Alert sits in the Flashbar's place and is the disabled reason for
// "View purchase options" (Disabled and read-only states). One primary button per page.
export default function ProductPage({ productId }) {
  const { buyer, experience, myRequests, openDrawerForProduct } = useStore();
  const product = findProduct(productId);
  const pageCase = productPageCase({ product, buyer, experience, requests: myRequests });
  const approved = pageCase === PAGE_CASE.APPROVED;

  return (
    <ContentLayout
      notifications={
        approved ? undefined : (
          <div data-testid="case-alert">
            <CaseAlert pageCase={pageCase} />
          </div>
        )
      }
      header={
        <Grid gridDefinition={[{ colspan: { default: 12, s: 8 } }, { colspan: { default: 12, s: 4 } }]}>
          <Header
            variant="h1"
            description={
              <>
                {vendorDiffers(product) && (
                  <>
                    {`Sold by: ${product.vendor}`}
                    <br />
                  </>
                )}
                {product.description}
              </>
            }
          >
            {product.name}
            {approved && (
              <>
                {' '}
                <ApprovedBadge />
              </>
            )}
          </Header>
          {/* Right-hand action stack, top to bottom (frame 3). */}
          <SpaceBetween size="xs">
            <Button variant="primary" fullWidth disabled={!approved}>
              {COPY.viewPurchaseOptions}
            </Button>
            {pageCase === PAGE_CASE.REQUESTABLE && (
              <Button iconName="gen-ai" fullWidth onClick={() => openDrawerForProduct(product.product_id)}>
                {COPY.requestApproval}
              </Button>
            )}
          </SpaceBetween>
        </Grid>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Overview</Header>}>
          <Box variant="p">{product.description}.</Box>
        </Container>
        <Container header={<Header variant="h2">Details</Header>}>
          <KeyValuePairs
            columns={3}
            items={[
              { label: 'Sold by', value: product.vendor },
              { label: 'Delivery method', value: product.type },
              { label: 'Category', value: product.category },
            ]}
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
