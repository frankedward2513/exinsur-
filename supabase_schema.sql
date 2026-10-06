-- EXINS WORKING Supabase schema
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.bales (
  id text primary key,
  bale_code text not null,
  bale_name text not null,
  category text not null default '',
  supplier_id text not null default '',
  supplier_name text not null default '',
  total_purchase_price numeric not null default 0,
  quantity_purchase numeric not null default 0,
  price_per_piece numeric not null default 0,
  description text not null default '',
  status text not null default 'sealed' check (status in ('sealed', 'opened', 'depleted')),
  total_sales_made numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text not null default '',
  color text not null default '',
  total_in_stock numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default '',
  bale_code text not null default '',
  bale_name text not null default '',
  available_quantity numeric not null default 0,
  selling_price numeric not null default 0,
  cost_price numeric not null default 0,
  size text not null default '',
  image_url text not null default '',
  product_link text not null default '',
  description text not null default '',
  barcode text not null default '',
  barcode_status text not null default 'new' check (barcode_status in ('new', 'done')),
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  description text not null default '',
  total_bales_sourced numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_accounts (
  id text primary key,
  name text not null,
  monthly_budget numeric not null default 0,
  description text not null default '',
  total_spent numeric not null default 0,
  color text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  account_id text not null default '',
  account_name text not null,
  amount numeric not null default 0,
  date text not null,
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer', 'card')),
  receipt_url text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null,
  user_id text,
  customer_name text not null default '',
  contact_number text not null default '',
  email text not null default '',
  address text not null default '',
  items jsonb not null default '[]'::jsonb,
  total_amount numeric not null default 0,
  payment_type text not null default 'pay_now' check (payment_type in ('pay_now', 'down_payment')),
  down_payment_amount numeric not null default 0,
  remaining_balance numeric not null default 0,
  receipt_url text not null default '',
  courier text,
  shipping_note text,
  status text not null check (status in ('pending', 'preparing', 'dropped_to_courier', 'completed', 'cancelled')),
  order_source text not null default 'online' check (order_source in ('online', 'pos')),
  discount numeric not null default 0,
  amount_tendered numeric,
  change_amount numeric,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists public.transactions (
  id text primary key,
  date text not null,
  flow_type text not null check (flow_type in ('inflow', 'outflow')),
  category text not null default '',
  account text not null default '',
  description text not null default '',
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer', 'card')),
  inflow numeric not null default 0,
  outflow numeric not null default 0,
  order_id text,
  expense_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  uid text not null unique,
  display_name text not null,
  email text not null,
  phone text,
  address text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'owner')),
  provider text,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.item_logs (
  id text primary key,
  product_id text not null,
  product_name text not null,
  type text not null check (type in ('sold', 'returned', 'damaged', 'lost')),
  quantity numeric not null default 0,
  date text not null,
  notes text,
  created_at timestamptz not null default now(),
  status text,
  found_quantity numeric,
  found_date text,
  found_notes text
);

create table if not exists public.users (
  id text primary key,
  uid text not null unique,
  email text not null,
  display_name text not null,
  role text not null default 'customer' check (role in ('customer', 'staff', 'owner')),
  phone text,
  address text,
  provider text,
  is_guest boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_bales_supplier_id on public.bales (supplier_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_expenses_account_id on public.expenses (account_id);
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_transactions_date on public.transactions (date);
create index if not exists idx_customers_email on public.customers (email);
create index if not exists idx_item_logs_product_id on public.item_logs (product_id);

alter table public.bales enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.expense_accounts enable row level security;
alter table public.expenses enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.customers enable row level security;
alter table public.item_logs enable row level security;
alter table public.users enable row level security;

-- Create policies only when they do not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.bales for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.bales for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.categories for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.categories for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.products for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.products for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.suppliers for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.suppliers for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.expense_accounts for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.expense_accounts for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.expenses for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.expenses for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.orders for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.orders for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.transactions for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.transactions for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.customers for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.customers for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.item_logs for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.item_logs for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow authenticated users to read all data'
  ) then
    create policy "Allow authenticated users to read all data"
      on public.users for select to authenticated using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow authenticated users to mutate all data'
  ) then
    create policy "Allow authenticated users to mutate all data"
      on public.users for all to authenticated using (true) with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bales'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.bales for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.categories for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.products for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.suppliers for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expense_accounts'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.expense_accounts for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'expenses'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.expenses for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.orders for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'transactions'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.transactions for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.customers for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'item_logs'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.item_logs for select to anon using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Allow public anonymous access for app bootstrap'
  ) then
    create policy "Allow public anonymous access for app bootstrap"
      on public.users for select to anon using (true);
  end if;
end $$;

-- In Supabase Auth, set app_metadata.exins_role to admin or staff for the matching
-- pre-provisioned email/password account. Never use user_metadata for role grants.
create or replace function public.exins_current_role()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'exinadmin@gmail.com'
      and auth.jwt() -> 'app_metadata' ->> 'exins_role' = 'admin'
      and auth.jwt() -> 'app_metadata' ->> 'provider' = 'email'
      then 'owner'
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'exinstaff@gmail.com'
      and auth.jwt() -> 'app_metadata' ->> 'exins_role' = 'staff'
      and auth.jwt() -> 'app_metadata' ->> 'provider' = 'email'
      then 'staff'
    else 'customer'
  end;
$$;

revoke all on function public.exins_current_role() from public;
grant execute on function public.exins_current_role() to anon, authenticated;

-- Replace all prior table policies so no permissive demo policy can bypass these rules.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'bales', 'categories', 'products', 'suppliers', 'expense_accounts',
        'expenses', 'orders', 'transactions', 'customers', 'item_logs', 'users'
      ])
  loop
    execute format(
      'drop policy %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end $$;

create policy "Store staff manage bales"
  on public.bales for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Showcase read categories"
  on public.categories for select to anon, authenticated using (true);
create policy "Store staff manage categories"
  on public.categories for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Showcase read products"
  on public.products for select to anon, authenticated using (true);
create policy "Store staff manage products"
  on public.products for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Store staff manage suppliers"
  on public.suppliers for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Owner manage expense accounts"
  on public.expense_accounts for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');
create policy "Owner manage expenses"
  on public.expenses for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');

create policy "Role-scoped read orders"
  on public.orders for select to authenticated
  using (
    public.exins_current_role() = 'owner'
    or (public.exins_current_role() = 'staff' and order_source = 'pos')
    or (
      public.exins_current_role() in ('customer', 'staff')
      and user_id = (select auth.uid())::text
      and order_source = 'online'
    )
  );
create policy "Role-scoped create orders"
  on public.orders for insert to authenticated
  with check (
    public.exins_current_role() = 'owner'
    or (
      public.exins_current_role() = 'staff'
      and order_source = 'pos'
    )
    or (
      public.exins_current_role() in ('customer', 'staff')
      and user_id = (select auth.uid())::text
      and order_source = 'online'
      and status = 'pending'
    )
  );
create policy "Role-scoped update orders"
  on public.orders for update to authenticated
  using (
    public.exins_current_role() = 'owner'
    or (public.exins_current_role() = 'staff' and order_source = 'pos')
  )
  with check (
    public.exins_current_role() = 'owner'
    or (public.exins_current_role() = 'staff' and order_source = 'pos')
  );
create policy "Owner delete orders"
  on public.orders for delete to authenticated
  using (public.exins_current_role() = 'owner');

create policy "Owner read transactions"
  on public.transactions for select to authenticated
  using (public.exins_current_role() = 'owner');
create policy "Role-scoped create transactions"
  on public.transactions for insert to authenticated
  with check (
    public.exins_current_role() = 'owner'
    or (
      public.exins_current_role() = 'staff'
      and category = 'POS Sales'
      and exists (
        select 1 from public.orders o
        where o.id = transactions.order_id
          and o.order_source = 'pos'
      )
    )
    or (
      public.exins_current_role() in ('customer', 'staff')
      and flow_type = 'inflow'
      and category = 'Showcase Sales'
      and exists (
        select 1 from public.orders o
        where o.id = transactions.order_id
          and o.user_id = (select auth.uid())::text
          and o.order_source = 'online'
          and transactions.inflow = case
            when o.payment_type = 'down_payment' then o.down_payment_amount
            else o.total_amount
          end
      )
    )
  );
create policy "Owner manage transactions"
  on public.transactions for update to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');
create policy "Owner delete transactions"
  on public.transactions for delete to authenticated
  using (public.exins_current_role() = 'owner');

create policy "Role-scoped read customers"
  on public.customers for select to authenticated
  using (public.exins_current_role() = 'owner' or uid = (select auth.uid())::text);
create policy "Customers create own profile"
  on public.customers for insert to authenticated
  with check (
    uid = (select auth.uid())::text
    and role = 'customer'
  );
create policy "Customers update own profile"
  on public.customers for update to authenticated
  using (uid = (select auth.uid())::text and role = 'customer')
  with check (uid = (select auth.uid())::text and role = 'customer');
create policy "Owner manage customers"
  on public.customers for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');

create policy "Store staff manage item logs"
  on public.item_logs for all to authenticated
  using (public.exins_current_role() in ('owner', 'staff'))
  with check (public.exins_current_role() in ('owner', 'staff'));

create policy "Role-scoped read users"
  on public.users for select to authenticated
  using (public.exins_current_role() = 'owner' or uid = (select auth.uid())::text);
create policy "Customers create own user record"
  on public.users for insert to authenticated
  with check (
    uid = (select auth.uid())::text
    and role = 'customer'
  );
create policy "Customers update own user record"
  on public.users for update to authenticated
  using (uid = (select auth.uid())::text and role = 'customer')
  with check (uid = (select auth.uid())::text and role = 'customer');
create policy "Owner manage users"
  on public.users for all to authenticated
  using (public.exins_current_role() = 'owner')
  with check (public.exins_current_role() = 'owner');

create or replace function public.exins_reserve_customer_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  requested_quantity numeric;
  requested_product_id text;
begin
  if public.exins_current_role() <> 'customer' then
    return new;
  end if;

  if jsonb_typeof(new.items) <> 'array' then
    raise exception 'Order items must be an array.';
  end if;

  for item in select value from jsonb_array_elements(new.items)
  loop
    requested_product_id := item ->> 'productId';
    requested_quantity := nullif(item ->> 'quantity', '')::numeric;
    if requested_product_id is null or requested_quantity is null or requested_quantity <= 0 then
      raise exception 'Order item has an invalid product or quantity.';
    end if;

    update public.products
    set available_quantity = available_quantity - requested_quantity
    where id = requested_product_id
      and available_quantity >= requested_quantity;

    if not found then
      raise exception 'Insufficient stock for product %.', requested_product_id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.exins_reserve_customer_order_stock() from public, anon, authenticated;

drop trigger if exists exins_reserve_customer_order_stock on public.orders;
create trigger exins_reserve_customer_order_stock
  before insert on public.orders
  for each row execute function public.exins_reserve_customer_order_stock();
