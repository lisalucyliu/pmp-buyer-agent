-- product_request: one row for each product request a buyer sends (Demo 2, prompt 2j).
-- Lisa runs this file one time in the Supabase SQL Editor. The app never runs it.
-- The fields are RECORD_FIELDS in shared/productRequest.js, plus request_id, visitor_id and created_at.
-- No buyer name (decision 25).

create table public.product_request (
  request_id uuid primary key default gen_random_uuid(),
  -- A random ID that the browser makes and keeps (decision 1 of prompt 2j). A visitor sees only their own rows.
  visitor_id uuid not null,
  account_id text not null,
  product_id text not null,
  experience text not null,
  note text not null default '' check (char_length(note) <= 500),
  po_number text not null default '' check (char_length(po_number) <= 100),
  date timestamptz not null,
  status text not null check (status in ('Pending', 'Approved', 'Declined', 'Canceled', 'Expired')),
  created_at timestamptz not null default now()
);

-- The database also blocks a duplicate open request: one Pending row for each visitor, account and product.
create unique index product_request_one_pending
  on public.product_request (visitor_id, account_id, product_id)
  where status = 'Pending';

-- Row level security is on, with no policies. With no policy, the publishable key (roles anon and
-- authenticated) can read or write no row. Only the server function uses the database, with the
-- secret key (role service_role), which is not limited by row level security.
alter table public.product_request enable row level security;

-- This project does not grant new tables to the Data API automatically (Lisa's Supabase setting, Nov 18).
-- Grant only what the server function needs, and only to service_role (the role of the secret key).
-- No grant to anon or authenticated, so a key in a browser can never reach this table.
-- No delete: cancel changes the status to Canceled.
grant select, insert, update on public.product_request to service_role;
