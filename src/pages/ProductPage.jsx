import { useEffect, useRef, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import FormField from '@cloudscape-design/components/form-field';
import Grid from '@cloudscape-design/components/grid';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import Link from '@cloudscape-design/components/link';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tabs from '@cloudscape-design/components/tabs';
import TextContent from '@cloudscape-design/components/text-content';
import {
  borderRadiusContainer,
  colorBackgroundLayoutMain,
  colorBackgroundCellShaded,
  colorBorderDividerDefault,
  colorTextBodySecondary,
  spaceScaledL,
} from '@cloudscape-design/design-tokens';
import { findProduct, vendorDiffers } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { PAGE_CASE, productPageCase } from '../../shared/productPageCase.js';
import { ROUTES, discoverRoute } from '../../shared/productRoutes.js';
import ApprovedBadge from '../components/ApprovedBadge.jsx';
import GenAiButton from '../components/GenAiButton.jsx';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';

// Layout and components: Lisa's Figma frames "PMP buyer PDP - approved" and "PMP buyer PDP - not
// approved" (frame 3 round trip). Text and product data: the spec and catalog.json.
// catalog.json has no logo, media, long overview, highlights, version, pricing, legal, usage,
// resources or support content. Those slots show clearly fake placeholder text in square brackets,
// the same for every product. No product facts and no prices (decision 107).
export const PLACEHOLDER = {
  logo: '[Logo]',
  media: '[Product video]',
  overview: '[Placeholder: long product overview. The catalog has only the short description.]',
  overviewMore: '[Placeholder: more overview text.]',
  highlights: ['[Placeholder: highlight 1]', '[Placeholder: highlight 2]', '[Placeholder: highlight 3]'],
  value: '[Placeholder]',
  pricing: '[Placeholder: pricing information. The prototype shows no prices.]',
  refund: '[Placeholder: vendor refund policy]',
  terms: '[Placeholder: vendor terms and conditions]',
  disclaimer: '[Placeholder: content disclaimer]',
  version: '[Placeholder] - latest version',
  delivery: '[Placeholder: delivery details]',
  usage: '[Placeholder: usage instructions]',
  links: '[Placeholder: vendor links]',
  videos: '[Placeholder: vendor videos]',
  vendorSupport: '[Placeholder: vendor support information]',
  awsSupport: '[Placeholder: AWS infrastructure support information]',
};

// Section anchors (the tab row in the frames). Tab labels and section titles are from the frames.
const SECTIONS = [
  { id: 'overview', label: 'Overview', title: 'Overview' },
  { id: 'pricing', label: 'Pricing', title: 'Pricing' },
  { id: 'legal', label: 'Legal', title: 'Legal' },
  { id: 'usage', label: 'Usage', title: 'Usage information' },
  { id: 'resources', label: 'Resources', title: 'Resources' },
  { id: 'support', label: 'Support', title: 'Support' },
];

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

// Image slot with no image in the catalog. Design tokens only.
function ImagePlaceholder({ label, width, height, rounded = true }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width,
        height,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colorBackgroundCellShaded,
        border: rounded ? `1px solid ${colorBorderDividerDefault}` : 'none',
        borderRadius: rounded ? borderRadiusContainer : 0,
        color: colorTextBodySecondary,
      }}
    >
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

// Section title: the frames use the page heading size (Header/Page) for each section.
// Heading levels (Lisa's answer Nov 16: 1 h1, no skipped levels): product name h1, section titles h2,
// container titles h3 (container look), sub-titles inside a container h4.
function Section({ section, children }) {
  return (
    <section id={section.id} aria-label={section.title} style={{ marginTop: spaceScaledL }}>
      <Box padding={{ top: 'xxxl' }}>
        <SpaceBetween size="l">
          <Header variant="h1" headingTagOverride="h2">
            {section.title}
          </Header>
          {children}
        </SpaceBetween>
      </Box>
    </section>
  );
}

function Overview({ product }) {
  const [more, setMore] = useState(false);
  return (
    <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
      <SpaceBetween size="l">
        <Container media={{ content: <ImagePlaceholder label={PLACEHOLDER.media} width="100%" height="100%" rounded={false} />, height: 260, position: 'top' }}>
          <Box variant="small">1/1</Box>
        </Container>
        <SpaceBetween size="s">
          <Box variant="p">{PLACEHOLDER.overview}</Box>
          {more && <Box variant="p">{PLACEHOLDER.overviewMore}</Box>}
          <div>
            <Button variant="inline-link" iconName={more ? 'subtract-minus' : 'add-plus'} ariaExpanded={more} onClick={() => setMore(!more)}>
              {more ? 'Show less' : 'Show more'}
            </Button>
          </div>
        </SpaceBetween>
      </SpaceBetween>
      <SpaceBetween size="l">
        <Container header={<Header variant="h2" headingTagOverride="h3">Highlights</Header>}>
          <TextContent>
            <ul>
              {PLACEHOLDER.highlights.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </TextContent>
        </Container>
        <Container header={<Header variant="h2" headingTagOverride="h3">Details</Header>}>
          <KeyValuePairs
            columns={1}
            items={[
              { label: 'Sold by', value: product.vendor },
              {
                label: 'Categories',
                value: (
                  <Link href={discoverRoute({ category: product.category })} onFollow={followHandler}>
                    {product.category}
                  </Link>
                ),
              },
              { label: 'Delivery method', value: product.type },
              { label: 'Delivery option', value: PLACEHOLDER.value },
              { label: 'Latest version', value: PLACEHOLDER.value },
              { label: 'Operating system', value: PLACEHOLDER.value },
            ]}
          />
        </Container>
      </SpaceBetween>
    </Grid>
  );
}

function TextContainer({ title, children }) {
  return (
    <Container header={<Header variant="h2" headingTagOverride="h3">{title}</Header>}>
      <Box variant="p">{children}</Box>
    </Container>
  );
}

// Approved deviation D5 (docs/deviations.md): Cloudscape Tabs used to jump to sections on one page,
// as in Lisa's frame and the live AWS Marketplace product page. The tab row stays in view under the
// sticky bars at the top of the window (the top navigation and, on narrow screens, the App layout
// toolbar). The active tab follows the scroll.

// A bar is a sticky or fixed element no taller than this. Taller fixed layers (for example the App
// layout navigation over the page on phones) are not bars.
const MAX_BAR_HEIGHT = 120;

function stuckBar(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.dataset?.tabRow) return null;
    const { position } = getComputedStyle(node);
    if (position === 'sticky' || position === 'fixed') {
      return node.getBoundingClientRect().height <= MAX_BAR_HEIGHT ? node : null;
    }
  }
  return null;
}

// Bottom of the sticky bars above the tab row, measured in the browser (no hardcoded pixel value).
function barsBottom() {
  let bottom = 0;
  for (let i = 0; i < 4; i += 1) {
    const bar = document.elementsFromPoint(window.innerWidth / 2, bottom + 1).map(stuckBar).find(Boolean);
    if (!bar) break;
    const next = bar.getBoundingClientRect().bottom;
    if (next <= bottom) break;
    bottom = next;
  }
  return bottom;
}

// Where the page content starts under the bars and the stuck tab row.
function contentTop() {
  const tabRow = document.querySelector('[data-tab-row]');
  return barsBottom() + (tabRow ? tabRow.getBoundingClientRect().height : 0);
}

function currentSection(chosen) {
  const scroller = document.scrollingElement;
  // At the bottom of the page, the last sections can't reach the line. Then the tab the buyer chose
  // stays active (if its section is on screen). Otherwise the last section is active.
  if (scroller && scroller.scrollTop + window.innerHeight >= scroller.scrollHeight - 2 && scroller.scrollTop > 0) {
    const el = chosen && document.getElementById(chosen);
    if (el && el.getBoundingClientRect().top < window.innerHeight) return chosen;
    return SECTIONS[SECTIONS.length - 1].id;
  }
  const line = contentTop() + 1;
  let active = SECTIONS[0].id;
  for (const section of SECTIONS) {
    const el = document.getElementById(section.id);
    if (el && el.getBoundingClientRect().top <= line) active = section.id;
  }
  return active;
}

// Active tab and the tab row's sticky top. Both are measured again on each scroll and resize.
function useSectionTabs(chosen) {
  const [state, setState] = useState({ active: SECTIONS[0].id, top: 0 });
  useEffect(() => {
    const update = () => {
      const next = { active: currentSection(chosen.current), top: barsBottom() };
      setState((prev) => (prev.active === next.active && prev.top === next.top ? prev : next));
    };
    // The buyer scrolls by hand: forget the chosen tab.
    const forget = () => {
      chosen.current = null;
    };
    document.addEventListener('wheel', forget, { passive: true });
    document.addEventListener('touchstart', forget, { passive: true });
    // capture: true also gets scroll events from a scrolling element inside the page.
    document.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    update();
    const late = window.setTimeout(update, 300); // after the top navigation and App layout settle
    return () => {
      window.clearTimeout(late);
      document.removeEventListener('wheel', forget);
      document.removeEventListener('touchstart', forget);
      document.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [chosen]);
  return state;
}

// Frame 3, all 5 cases (spec table). The Alert sits above the header (the Flashbar's place) and is
// the disabled reason for "View purchase options". One primary button per page.
export default function ProductPage({ productId }) {
  const { buyer, experience, myRequests, openDrawerForProduct } = useStore();
  const product = findProduct(productId);
  const pageCase = productPageCase({ product, buyer, experience, requests: myRequests });
  const approved = pageCase === PAGE_CASE.APPROVED;
  const chosenTab = useRef(null);
  const { active: activeTab, top: tabRowTop } = useSectionTabs(chosenTab);

  const goToSection = (id) => {
    chosenTab.current = id;
    const el = document.getElementById(id);
    if (!el) return;
    // Put the section top under the sticky bars and the tab row. The section's own top padding keeps
    // the title clear.
    const top = el.getBoundingClientRect().top + window.scrollY - contentTop();
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // The page is a plain block, so the sticky tab row (a direct child) can stay in view for the
  // whole page. Gaps: 20px (spaceScaledL) between the header, the tab row and the sections.
  return (
    <div>
      <SpaceBetween size="l">
        {!approved && (
          <div data-testid="case-alert">
            <CaseAlert pageCase={pageCase} />
          </div>
        )}
        <Grid gridDefinition={[{ colspan: { default: 12, s: 8 } }, { colspan: { default: 12, s: 4 } }]}>
          <SpaceBetween size="l">
            <SpaceBetween direction="horizontal" size="l" alignItems="center">
              <ImagePlaceholder label={PLACEHOLDER.logo} width={140} height={80} />
              {/* Spec frame 3: no "Sold by" line when the vendor equals the product name. */}
              <Header variant="h1" description={vendorDiffers(product) ? `Sold by: ${product.vendor}` : undefined}>
                {product.name}
              </Header>
            </SpaceBetween>
            <SpaceBetween size="s">
              {approved && (
                <div>
                  <ApprovedBadge />
                </div>
              )}
              <Box variant="p" data-testid="product-description">
                {product.description}
              </Box>
            </SpaceBetween>
          </SpaceBetween>
          {/* Right-hand action stack, top to bottom (frame 3). */}
          <SpaceBetween size="xs" alignItems="end">
            <Button variant="primary" disabled={!approved}>
              {COPY.viewPurchaseOptions}
            </Button>
            {pageCase === PAGE_CASE.REQUESTABLE && (
              <GenAiButton onClick={() => openDrawerForProduct(product.product_id)}>{COPY.requestApproval}</GenAiButton>
            )}
          </SpaceBetween>
        </Grid>
      </SpaceBetween>
      {/* D5: sticky tab row. Design tokens only; the z-index is below the top navigation (1002). */}
      <div
        data-tab-row="true"
        style={{ position: 'sticky', top: tabRowTop, zIndex: 1001, background: colorBackgroundLayoutMain, marginTop: spaceScaledL }}
      >
          <Tabs
            activeTabId={activeTab}
            onChange={({ detail }) => goToSection(detail.activeTabId)}
            ariaLabel="Product page sections"
            disableContentPaddings
            tabs={SECTIONS.map((section) => ({ id: section.id, label: section.label }))}
          />
      </div>

      <Section section={SECTIONS[0]}>
        <Overview product={product} />
      </Section>

      <Section section={SECTIONS[1]}>
        <TextContainer title={product.name}>{PLACEHOLDER.pricing}</TextContainer>
        <TextContainer title="Vendor refund policy">{PLACEHOLDER.refund}</TextContainer>
      </Section>

      <Section section={SECTIONS[2]}>
        <TextContainer title="Vendor terms and conditions">{PLACEHOLDER.terms}</TextContainer>
        <TextContainer title="Content disclaimer">{PLACEHOLDER.disclaimer}</TextContainer>
      </Section>

      <Section section={SECTIONS[3]}>
        <Grid gridDefinition={[{ colspan: { default: 12, s: 4 } }]}>
          <FormField label="Version">
            <Select selectedOption={{ label: PLACEHOLDER.version, value: 'latest' }} options={[{ label: PLACEHOLDER.version, value: 'latest' }]} onChange={() => {}} />
          </FormField>
        </Grid>
        <Container header={<Header variant="h2" headingTagOverride="h3">Delivery details</Header>}>
          <SpaceBetween size="xs">
            <Box variant="h3" tagOverride="h4">{product.type}</Box>
            <Box variant="p">{PLACEHOLDER.delivery}</Box>
          </SpaceBetween>
        </Container>
        <Container header={<Header variant="h2" headingTagOverride="h3">Additional details</Header>}>
          <SpaceBetween size="xs">
            <Box variant="h3" tagOverride="h4">Usage instructions</Box>
            <Box variant="p">{PLACEHOLDER.usage}</Box>
          </SpaceBetween>
        </Container>
      </Section>

      <Section section={SECTIONS[4]}>
        <Container header={<Header variant="h2" headingTagOverride="h3">Vendor resources</Header>}>
          <Tabs
            ariaLabel="Vendor resources"
            tabs={[
              { id: 'links', label: 'Links', content: <Box variant="p">{PLACEHOLDER.links}</Box> },
              { id: 'videos', label: 'Videos', content: <Box variant="p">{PLACEHOLDER.videos}</Box> },
            ]}
          />
        </Container>
      </Section>

      <Section section={SECTIONS[5]}>
        <Grid gridDefinition={[{ colspan: { default: 12, s: 6 } }, { colspan: { default: 12, s: 6 } }]}>
          <TextContainer title="Vendor support">{PLACEHOLDER.vendorSupport}</TextContainer>
          <TextContainer title="AWS infrastructure support">{PLACEHOLDER.awsSupport}</TextContainer>
        </Grid>
      </Section>
    </div>
  );
}
