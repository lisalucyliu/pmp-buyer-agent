import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { BUYERS, experienceFor } from '../shared/catalog.js';
import { COPY } from '../shared/copy.js';
import { OTHER_CONSOLE_PAGES, ROUTES, discoverRoute, productIdForRoute } from '../shared/productRoutes.js';
import AssistantDrawer from './drawer/AssistantDrawer.jsx';
import { followHandler, navigate, useLocation } from './router.js';
import { useStore } from './state/store.jsx';
import Discover from './pages/Discover.jsx';
import MyPrivateMarketplace from './pages/MyPrivateMarketplace.jsx';
import NotFound from './pages/NotFound.jsx';
import NotInPrototype from './pages/NotInPrototype.jsx';
import ProductPage from './pages/ProductPage.jsx';
import ProductRequests from './pages/ProductRequests.jsx';
import RequestForm from './pages/RequestForm.jsx';
import { findProduct } from '../shared/catalog.js';

export const DRAWER_ID = 'product-request-assistant';
const NAV_WIDTH = 280; // App layout default navigationWidth
const DRAWER_WIDTH = 420;
const MIN_PAGE_WIDTH = 400;
// Cloudscape mobile breakpoint: below this width, App layout shows the navigation over the page.
const PHONE_MAX_WIDTH = 688;

// Buyer menu (Q1 option A). Switching clears the conversation.
function TopNav() {
  const { buyer, switchBuyer } = useStore();
  return createPortal(
    <TopNavigation
      identity={{ href: ROUTES.myPrivateMarketplace, title: 'Console prototype', onFollow: followHandler }}
      utilities={[
        {
          type: 'menu-dropdown',
          text: buyer.name,
          description: experienceFor(buyer).branding_name,
          iconName: 'user-profile',
          ariaLabel: `Buyer: ${buyer.name}. Switch buyer`,
          items: BUYERS.map((item) => ({
            id: item.id,
            text: item.name,
            secondaryText: experienceFor(item).branding_name,
            checked: item.id === buyer.id,
          })),
          onItemClick: ({ detail }) => switchBuyer(detail.id),
        },
      ]}
    />,
    document.getElementById('top-nav'),
  );
}

// Left nav "Private Marketplace" is an expandable link group (Figma frames). Its own link opens
// My Private Marketplace. It has its own href, so only the page link inside it shows as active.
const PMP_GROUP_HREF = '/private-marketplace';
const PRODUCT_PAGE_WIDTH = 1040;

// Breadcrumbs follow the Figma frames: AWS Marketplace > Private Marketplace > page, and
// AWS Marketplace > category > product on a product page.
const PMP_CRUMB = { text: 'Private Marketplace', href: PMP_GROUP_HREF };

function pageFor(path) {
  if (path === ROUTES.myPrivateMarketplace || path === PMP_GROUP_HREF) {
    return { key: 'my-pmp', element: <MyPrivateMarketplace />, crumbs: [PMP_CRUMB, { text: 'My Private Marketplace' }] };
  }
  if (path === ROUTES.productRequests) return { key: 'requests', element: <ProductRequests />, crumbs: [PMP_CRUMB, { text: COPY.productRequests }] };
  if (path === ROUTES.discover) return { key: 'discover', element: <Discover />, crumbs: [{ text: COPY.discoverProducts }] };
  if (path === ROUTES.requestForm) return { key: 'form', element: <RequestForm />, crumbs: [PMP_CRUMB, { text: COPY.formTitle }] };
  const other = OTHER_CONSOLE_PAGES.find((item) => item.href === path);
  if (other) return { key: other.href, element: <NotInPrototype title={other.text} />, crumbs: [{ text: other.text }] };
  const productId = productIdForRoute(path);
  if (productId) {
    const product = findProduct(productId);
    return {
      key: `product-${productId}`,
      element: <ProductPage productId={productId} />,
      crumbs: [{ text: product.category, href: discoverRoute({ category: product.category }) }, { text: product.name }],
      // The product page frames center the content in a 1040px column.
      maxContentWidth: PRODUCT_PAGE_WIDTH,
    };
  }
  return { key: 'not-found', element: <NotFound />, crumbs: [{ text: 'Page not found' }] };
}

function activeNavHref(path) {
  if (path.startsWith('/products/')) return ROUTES.discover;
  if (path === PMP_GROUP_HREF) return ROUTES.myPrivateMarketplace;
  if (path === ROUTES.requestForm) return ROUTES.productRequests;
  return path;
}

export default function App() {
  const { path, href } = useLocation();
  const { buyer, experience, myRequests, drawerOpen, setDrawerOpen, setEmptyMode, conversation } = useStore();
  const page = pageFor(path);
  const layoutRef = useRef(null);
  const [navigationOpen, setNavigationOpen] = useState(true);

  // When the drawer opens and the page would have less than 400px left between the side navigation
  // (280px) and the drawer (420px), close the side navigation (App layout navigationOpen). On phones,
  // closeNavigationIfNecessary does it. The buyer can open the navigation again at any time.
  // When the drawer closes, the side navigation opens again if it was open before the drawer closed it
  // (design review, Lisa's answer Nov 16). Not on phones, where the navigation covers the page.
  const navOpenBeforeDrawer = useRef(false);
  const navigationOpenRef = useRef(navigationOpen);
  navigationOpenRef.current = navigationOpen;
  useEffect(() => {
    if (drawerOpen) {
      navOpenBeforeDrawer.current = navigationOpenRef.current;
      layoutRef.current?.closeNavigationIfNecessary();
      if (window.innerWidth < NAV_WIDTH + DRAWER_WIDTH + MIN_PAGE_WIDTH) setNavigationOpen(false);
      return;
    }
    if (navOpenBeforeDrawer.current && window.innerWidth >= PHONE_MAX_WIDTH) setNavigationOpen(true);
    navOpenBeforeDrawer.current = false;
  }, [drawerOpen]);

  // Sam variant: Product requests is hidden in the left nav (decided Nov 13), unless the buyer sent
  // requests before requests were turned off.
  const showRequestsPage = experience.requests_enabled || myRequests.length > 0;
  const pmpPages = [
    { type: 'link', text: 'My Private Marketplace', href: ROUTES.myPrivateMarketplace },
    ...(showRequestsPage ? [{ type: 'link', text: COPY.productRequests, href: ROUTES.productRequests }] : []),
  ];
  const inPmp = pmpPages.some((item) => item.href === activeNavHref(path));
  // Items, order and component from the Figma frames (Side navigation PMP buyer).
  const navItems = [
    { type: 'link', text: COPY.discoverProducts, href: ROUTES.discover },
    ...OTHER_CONSOLE_PAGES.slice(0, 4).map((item) => ({ type: 'link', ...item })),
    { type: 'expandable-link-group', text: 'Private Marketplace', href: PMP_GROUP_HREF, defaultExpanded: inPmp, items: pmpPages },
    { type: 'link', ...OTHER_CONSOLE_PAGES[4] },
  ];

  const crumbs = [
    { text: 'AWS Marketplace', href: ROUTES.discover },
    ...page.crumbs.map((crumb, i) => ({ text: crumb.text, href: i === page.crumbs.length - 1 ? '#' : crumb.href })),
  ];

  return (
    <>
      <TopNav />
      <AppLayout
        ref={layoutRef}
        headerSelector="#top-nav"
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsHide
        maxContentWidth={page.maxContentWidth}
        navigation={
          <SideNavigation
            header={{ text: 'AWS Marketplace', href: ROUTES.discover }}
            activeHref={activeNavHref(path)}
            items={navItems}
            onFollow={followHandler}
          />
        }
        breadcrumbs={
          <BreadcrumbGroup
            items={crumbs}
            ariaLabel="Breadcrumbs"
            onFollow={(event) => {
              event.preventDefault();
              if (event.detail.href !== '#') navigate(event.detail.href);
            }}
          />
        }
        content={<div key={`${href}-${buyer.id}`}>{page.element}</div>}
        drawers={[
          {
            id: DRAWER_ID,
            content: <AssistantDrawer />,
            trigger: { iconName: 'gen-ai' },
            ariaLabels: {
              drawerName: COPY.drawerTitle,
              triggerButton: COPY.triggerAriaLabel,
              closeButton: COPY.closeAriaLabel,
              resizeHandle: 'Resize product request assistant',
            },
            resizable: true,
            defaultSize: DRAWER_WIDTH,
          },
        ]}
        activeDrawerId={drawerOpen ? DRAWER_ID : null}
        onDrawerChange={({ detail }) => {
          const open = detail.activeDrawerId === DRAWER_ID;
          // Opened from the trigger bar: frame 4 empty state, unless a conversation already started.
          if (open && !drawerOpen && conversation.turns.length === 0) setEmptyMode('ask');
          setDrawerOpen(open);
        }}
      />
    </>
  );
}
