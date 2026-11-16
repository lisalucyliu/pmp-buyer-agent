import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@cloudscape-design/components/app-layout';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import { BUYERS, experienceFor } from '../shared/catalog.js';
import { COPY } from '../shared/copy.js';
import { ROUTES, productIdForRoute } from '../shared/productRoutes.js';
import AssistantDrawer from './drawer/AssistantDrawer.jsx';
import { followHandler, navigate, useLocation } from './router.js';
import { useStore } from './state/store.jsx';
import Discover from './pages/Discover.jsx';
import MyPrivateMarketplace from './pages/MyPrivateMarketplace.jsx';
import NotFound from './pages/NotFound.jsx';
import ProductPage from './pages/ProductPage.jsx';
import ProductRequests from './pages/ProductRequests.jsx';
import RequestForm from './pages/RequestForm.jsx';
import { findProduct } from '../shared/catalog.js';

export const DRAWER_ID = 'product-request-assistant';
const NAV_WIDTH = 280; // App layout default navigationWidth
const DRAWER_WIDTH = 420;
const MIN_PAGE_WIDTH = 400;

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

function pageFor(path) {
  if (path === ROUTES.myPrivateMarketplace) return { key: 'my-pmp', element: <MyPrivateMarketplace />, crumbs: ['Private Marketplace', 'My Private Marketplace'] };
  if (path === ROUTES.productRequests) return { key: 'requests', element: <ProductRequests />, crumbs: ['Private Marketplace', COPY.productRequests] };
  if (path === ROUTES.discover) return { key: 'discover', element: <Discover />, crumbs: [COPY.discoverProducts] };
  if (path === ROUTES.requestForm) return { key: 'form', element: <RequestForm />, crumbs: ['Private Marketplace', COPY.formTitle] };
  const productId = productIdForRoute(path);
  if (productId) {
    return { key: `product-${productId}`, element: <ProductPage productId={productId} />, crumbs: [COPY.discoverProducts, findProduct(productId).name] };
  }
  return { key: 'not-found', element: <NotFound />, crumbs: ['Page not found'] };
}

const CRUMB_HREFS = {
  'Private Marketplace': ROUTES.myPrivateMarketplace,
  'My Private Marketplace': ROUTES.myPrivateMarketplace,
  [COPY.productRequests]: ROUTES.productRequests,
  [COPY.discoverProducts]: ROUTES.discover,
};

export default function App() {
  const { path, href } = useLocation();
  const { buyer, experience, myRequests, drawerOpen, setDrawerOpen, setEmptyMode, conversation } = useStore();
  const page = pageFor(path);
  const layoutRef = useRef(null);
  const [navigationOpen, setNavigationOpen] = useState(true);

  // When the drawer opens and the page would have less than 400px left between the side navigation
  // (280px) and the drawer (420px), close the side navigation (App layout navigationOpen). On phones,
  // closeNavigationIfNecessary does it. The buyer can open the navigation again at any time.
  useEffect(() => {
    if (!drawerOpen) return;
    layoutRef.current?.closeNavigationIfNecessary();
    if (window.innerWidth < NAV_WIDTH + DRAWER_WIDTH + MIN_PAGE_WIDTH) setNavigationOpen(false);
  }, [drawerOpen]);

  // Sam variant: Product requests is hidden in the left nav (decided Nov 13), unless the buyer sent
  // requests before requests were turned off.
  const showRequestsPage = experience.requests_enabled || myRequests.length > 0;
  const navItems = [
    { type: 'link', text: COPY.discoverProducts, href: ROUTES.discover },
    {
      type: 'section-group',
      title: 'Private Marketplace',
      items: [
        { type: 'link', text: 'My Private Marketplace', href: ROUTES.myPrivateMarketplace },
        ...(showRequestsPage ? [{ type: 'link', text: COPY.productRequests, href: ROUTES.productRequests }] : []),
      ],
    },
  ];
  const activeHref = path.startsWith('/products/') ? ROUTES.discover : path;

  const crumbs = [{ text: 'AWS Marketplace', href: ROUTES.discover }, ...page.crumbs.map((text, i) => ({
    text,
    href: i === page.crumbs.length - 1 ? '#' : CRUMB_HREFS[text] ?? ROUTES.myPrivateMarketplace,
  }))];

  return (
    <>
      <TopNav />
      <AppLayout
        ref={layoutRef}
        headerSelector="#top-nav"
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsHide
        navigation={
          <SideNavigation
            header={{ text: 'AWS Marketplace', href: ROUTES.discover }}
            activeHref={activeHref}
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
