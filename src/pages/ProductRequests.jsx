import { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { findProduct } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { REQUEST_STATUS, STATUS_INDICATOR_TYPE, formatRequestDate } from '../../shared/productRequest.js';
import { ROUTES, productRoute } from '../../shared/productRoutes.js';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';

// Frame 2. Columns and status decided Nov 14. Default sort: Date requested, newest first.
export default function ProductRequests() {
  const { experience, myRequests, cancelRequest, openDrawer } = useStore();
  const [sortingColumn, setSortingColumn] = useState({ sortingField: 'date' });
  const [sortingDescending, setSortingDescending] = useState(true);

  const rows = myRequests.map((request) => ({ ...request, productName: findProduct(request.product_id).name }));
  const field = sortingColumn.sortingField;
  rows.sort((a, b) => {
    const order = field === 'date' ? a.date.localeCompare(b.date) : String(a[field]).localeCompare(String(b[field]));
    return sortingDescending ? -order : order;
  });

  const columns = [
    {
      id: 'product',
      header: 'Requested product',
      sortingField: 'productName',
      isRowHeader: true,
      cell: (row) => (
        <Link href={productRoute(row.product_id)} onFollow={followHandler}>
          {row.productName}
        </Link>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortingField: 'status',
      cell: (row) => <StatusIndicator type={STATUS_INDICATOR_TYPE[row.status]}>{row.status}</StatusIndicator>,
    },
    { id: 'date', header: 'Date requested (UTC-05:00)', sortingField: 'date', cell: (row) => formatRequestDate(row.date) },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row) =>
        row.status === REQUEST_STATUS.PENDING ? (
          <Button variant="inline-link" ariaLabel={`Cancel request for ${row.productName}`} onClick={() => cancelRequest(row.request_id)}>
            Cancel request
          </Button>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <Table
      variant="full-page"
      items={rows}
      columnDefinitions={columns}
      trackBy="request_id"
      sortingColumn={columns.find((column) => column.sortingField === field)}
      sortingDescending={sortingDescending}
      onSortingChange={({ detail }) => {
        setSortingColumn(detail.sortingColumn);
        setSortingDescending(detail.isDescending);
      }}
      ariaLabels={{ tableLabel: COPY.productRequests }}
      header={
        <Header
          variant="awsui-h1-sticky"
          counter={`(${rows.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button href={ROUTES.discover} onFollow={followHandler}>
                {COPY.discoverProducts}
              </Button>
              {experience.requests_enabled && (
                <Button variant="primary" iconName="gen-ai" onClick={() => openDrawer('request')}>
                  {COPY.requestProduct}
                </Button>
              )}
            </SpaceBetween>
          }
        >
          {COPY.productRequests}
        </Header>
      }
      empty={
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="xxs">
            <Box variant="strong">No product requests</Box>
            <Box variant="p" color="inherit">
              Requests you send to your administrator show here.
            </Box>
          </SpaceBetween>
        </Box>
      }
    />
  );
}
