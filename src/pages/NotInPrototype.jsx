import Box from '@cloudscape-design/components/box';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import { ROUTES } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';

// Left nav items from the Figma frames that the prototype doesn't build (guess, waiting for Lisa).
export default function NotInPrototype({ title }) {
  return (
    <ContentLayout header={<Header variant="h1">{title}</Header>}>
      <Box variant="p">
        This page isn&apos;t part of the prototype. Go to{' '}
        <Link href={ROUTES.myPrivateMarketplace} variant="primary" onFollow={followHandler}>
          My Private Marketplace
        </Link>
        .
      </Box>
    </ContentLayout>
  );
}
