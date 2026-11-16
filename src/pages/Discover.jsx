import { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Cards from '@cloudscape-design/components/cards';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import TextFilter from '@cloudscape-design/components/text-filter';
import Toggle from '@cloudscape-design/components/toggle';
import { PRODUCTS, isApproved, vendorDiffers } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { productRoute } from '../../shared/productRoutes.js';
import { rankProducts } from '../../shared/search.js';
import ApprovedBadge from '../components/ApprovedBadge.jsx';
import { followHandler, useLocation } from '../router.js';
import { useStore } from '../state/store.jsx';

const ALL_CATEGORIES = { label: 'All categories', value: '' };
const CATEGORY_OPTIONS = [ALL_CATEGORIES, ...[...new Set(PRODUCTS.map((p) => p.category))].sort().map((c) => ({ label: c, value: c }))];

// Discovery page. "Explore your Private Marketplace" opens it with the Approved products filter on.
// "Discover products" in the left nav opens it with no filters. The more-than-5 alternatives link
// adds the category filter (row 2). The text filter uses the same match and ranking as the agent.
export default function Discover() {
  const { params } = useLocation();
  const { experience } = useStore();
  const [text, setText] = useState('');
  const [approvedOnly, setApprovedOnly] = useState(params.get('approved') === 'true');
  const [category, setCategory] = useState(CATEGORY_OPTIONS.find((o) => o.value === (params.get('category') ?? '')) ?? ALL_CATEGORIES);

  let items = text.trim() ? rankProducts(PRODUCTS, text) : PRODUCTS;
  if (approvedOnly) items = items.filter((p) => isApproved(p, experience.id));
  if (category.value) items = items.filter((p) => p.category === category.value);

  const clear = () => {
    setText('');
    setApprovedOnly(false);
    setCategory(ALL_CATEGORIES);
  };

  return (
    <Cards
      variant="full-page"
      items={items}
      trackBy="product_id"
      ariaLabels={{ itemSelectionLabel: () => '', selectionGroupLabel: '' }}
      cardDefinition={{
        header: (product) => (
          <Link href={productRoute(product.product_id)} fontSize="heading-m" onFollow={followHandler}>
            {product.name}
          </Link>
        ),
        sections: [
          { id: 'vendor', content: (product) => (vendorDiffers(product) ? `By ${product.vendor}` : null) },
          { id: 'description', content: (product) => product.description },
          { id: 'badge', content: (product) => (isApproved(product, experience.id) ? <ApprovedBadge /> : null) },
        ],
      }}
      cardsPerRow={[{ cards: 1 }, { minWidth: 600, cards: 2 }, { minWidth: 1000, cards: 3 }]}
      header={
        <Header variant="awsui-h1-sticky" counter={`(${items.length})`}>
          {COPY.discoverProducts}
        </Header>
      }
      filter={
        <SpaceBetween direction="horizontal" size="m" alignItems="center">
          <TextFilter
            filteringText={text}
            filteringPlaceholder="Search products"
            filteringAriaLabel="Search products"
            onChange={({ detail }) => setText(detail.filteringText)}
            countText={`${items.length} ${items.length === 1 ? 'match' : 'matches'}`}
          />
          <Select
            selectedOption={category}
            options={CATEGORY_OPTIONS}
            onChange={({ detail }) => setCategory(detail.selectedOption)}
            ariaLabel="Category"
          />
          <Toggle checked={approvedOnly} onChange={({ detail }) => setApprovedOnly(detail.checked)}>
            Approved products
          </Toggle>
        </SpaceBetween>
      }
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="xs">
            <Box variant="strong">No matches</Box>
            <Button onClick={clear}>Clear filter</Button>
          </SpaceBetween>
        </Box>
      }
    />
  );
}
