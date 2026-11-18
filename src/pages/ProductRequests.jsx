import { useEffect, useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import TextFilter from '@cloudscape-design/components/text-filter';
import SpaceBetween from '@cloudscape-design/components/space-between';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Table from '@cloudscape-design/components/table';
import { findProduct } from '../../shared/catalog.js';
import { COPY } from '../../shared/copy.js';
import { REQUEST_STATUS, STATUS_INDICATOR_TYPE, formatRequestDate } from '../../shared/productRequest.js';
import { ROUTES, productRoute } from '../../shared/productRoutes.js';
import GenAiButton from '../components/GenAiButton.jsx';
import { followHandler } from '../router.js';
import { useStore } from '../state/store.jsx';

const PAGE_SIZE = 10;

// Frame 2. Columns and status decided Nov 14. Default sort: Date requested, newest first.
export default function ProductRequests() {
  const { experience, myRequests, cancelRequest, openDrawer, requestsLoading, setCancelError } = useStore();
  // The cancel error Flashbar belongs to this page. It goes away when the buyer leaves the page.
  useEffect(() => () => setCancelError(null), [setCancelError]);
  const [sortingColumn, setSortingColumn] = useState({ sortingField: 'date' });
  const [sortingDescending, setSortingDescending] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);

  const query = filterText.trim().toLowerCase();
  const rows = myRequests
    .map((request) => ({ ...request, productName: findProduct(request.product_id).name }))
    .filter((row) => !query || row.productName.toLowerCase().includes(query));
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
      minWidth: 150,
      width: 150,
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

  // The header count is always the total. The filtered count is in the filter (countText).
  // Tablet and phone: the Actions column is sticky, so "Cancel request" stays in view while the other
  // columns scroll sideways (Table: sticky columns). No line wrapping: it broke words in narrow columns.
  return (
    <Table
      variant="full-page"
      items={rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
      columnDefinitions={columns}
      trackBy="request_id"
      loading={requestsLoading}
      loadingText="Loading requests"
      stickyColumns={{ first: 0, last: 1 }}
      sortingColumn={columns.find((column) => column.sortingField === field)}
      sortingDescending={sortingDescending}
      onSortingChange={({ detail }) => {
        setSortingColumn(detail.sortingColumn);
        setSortingDescending(detail.isDescending);
      }}
      ariaLabels={{ tableLabel: COPY.productRequests }}
      filter={
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder="Find requests"
          filteringAriaLabel="Find requests"
          countText={`${rows.length} ${rows.length === 1 ? 'match' : 'matches'}`}
          onChange={({ detail }) => {
            setFilterText(detail.filteringText);
            setPage(1);
          }}
        />
      }
      pagination={
        <Pagination
          currentPageIndex={page}
          pagesCount={Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
          onChange={({ detail }) => setPage(detail.currentPageIndex)}
        />
      }
      header={
        <Header
          variant="awsui-h1-sticky"
          counter={`(${myRequests.length})`}
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button href={ROUTES.discover} onFollow={followHandler}>
                {COPY.discoverProducts}
              </Button>
              {experience.requests_enabled && (
                <GenAiButton variant="primary" onClick={() => openDrawer('request')}>
                  {COPY.requestProduct}
                </GenAiButton>
              )}
            </SpaceBetween>
          }
        >
          {COPY.productRequests}
        </Header>
      }
      empty={
        query ? (
          <Box textAlign="center" color="inherit">
            <SpaceBetween size="xs">
              <Box variant="strong">No matches</Box>
              <Button onClick={() => setFilterText('')}>Clear filter</Button>
            </SpaceBetween>
          </Box>
        ) : (
        <Box textAlign="center" color="inherit">
          <SpaceBetween size="xxs">
            <Box variant="strong">No product requests</Box>
            <Box variant="p" color="inherit">
              Requests you send to your administrator show here.
            </Box>
          </SpaceBetween>
        </Box>
        )
      }
    />
  );
}
