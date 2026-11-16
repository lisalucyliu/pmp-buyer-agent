import Link from '@cloudscape-design/components/link';
import List from '@cloudscape-design/components/list';
import { isApproved, vendorDiffers } from '../../shared/catalog.js';
import { productRoute } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';
import ApprovedBadge from './ApprovedBadge.jsx';

// The frame 6 List item. Code makes every link (decision 103):
// - content: product name as a secondary link to its console product page, same tab, no external icon
// - secondary content: "Vendor · description", vendor left out when it equals the product name
// - actions: the purple badge on approved products only (decision 33)
export function secondaryText(product) {
  return vendorDiffers(product) ? `${product.vendor} · ${product.description}` : product.description;
}

export default function ProductList({ products, experienceId, ariaLabel }) {
  return (
    <List
      ariaLabel={ariaLabel}
      items={products}
      renderItem={(product) => ({
        id: product.product_id,
        content: (
          <Link href={productRoute(product.product_id)} variant="secondary" onFollow={followHandler}>
            {product.name}
          </Link>
        ),
        secondaryContent: secondaryText(product),
        actions: isApproved(product, experienceId) ? <ApprovedBadge /> : undefined,
      })}
    />
  );
}
