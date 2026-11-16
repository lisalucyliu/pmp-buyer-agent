import Box from '@cloudscape-design/components/box';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import { ROUTES } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';

export default function NotFound() {
  return (
    <ContentLayout header={<Header variant="h1">Page not found</Header>}>
      <Box variant="p">
        This page doesn&apos;t exist in the prototype. Go to{' '}
        <Link href={ROUTES.myPrivateMarketplace} onFollow={followHandler}>
          My Private Marketplace
        </Link>
        .
      </Box>
    </ContentLayout>
  );
}
