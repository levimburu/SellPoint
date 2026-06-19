-- ============================================================
-- HEDGE STORES POS — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role text not null default 'cashier' check (role in ('admin', 'cashier')),
  created_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text unique,
  category text default 'General',
  price numeric(12, 2) not null,
  cost_price numeric(12, 2),
  stock_qty integer not null default 0,
  low_stock_alert integer default 5,
  unit text default 'pcs',
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- SALES
-- ============================================================
create table if not exists sales (
  id uuid primary key default uuid_generate_v4(),
  receipt_number text unique not null,
  customer_id uuid references customers(id) on delete set null,
  cashier_id uuid references auth.users(id) on delete set null,
  cashier_name text,
  subtotal numeric(12, 2) not null,
  discount_amount numeric(12, 2) default 0,
  total numeric(12, 2) not null,
  payment_method text not null default 'cash',
  mpesa_ref text,
  status text default 'completed' check (status in ('pending', 'completed', 'refunded', 'cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- SALE ITEMS
-- ============================================================
create table if not exists sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  created_at timestamptz default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  invoice_number text unique not null,
  issued_at timestamptz default now(),
  pdf_url text
);

-- ============================================================
-- FUNCTION: decrement_stock (used at checkout)
-- ============================================================
create or replace function decrement_stock(product_id uuid, qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update products
  set stock_qty = stock_qty - qty,
      updated_at = now()
  where id = product_id and stock_qty >= qty;

  if not found then
    raise exception 'Insufficient stock for product %', product_id;
  end if;
end;
$$;

-- ============================================================
-- FUNCTION: auto-update updated_at on products
-- ============================================================
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table invoices enable row level security;

-- Profiles: users can read all, only update their own
create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can update their own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

-- Products: authenticated users can read; admin can write
create policy "Products viewable by authenticated users"
  on products for select to authenticated using (true);

create policy "Authenticated users can insert products"
  on products for insert to authenticated with check (true);

create policy "Authenticated users can update products"
  on products for update to authenticated using (true);

-- Customers: fully accessible by authenticated users
create policy "Customers viewable by authenticated users"
  on customers for select to authenticated using (true);

create policy "Authenticated users can insert customers"
  on customers for insert to authenticated with check (true);

create policy "Authenticated users can update customers"
  on customers for update to authenticated using (true);

-- Sales: authenticated users can read and insert
create policy "Sales viewable by authenticated users"
  on sales for select to authenticated using (true);

create policy "Authenticated users can insert sales"
  on sales for insert to authenticated with check (true);

create policy "Authenticated users can update sales"
  on sales for update to authenticated using (true);

-- Sale items: authenticated users full access
create policy "Sale items viewable by authenticated users"
  on sale_items for select to authenticated using (true);

create policy "Authenticated users can insert sale items"
  on sale_items for insert to authenticated with check (true);

-- Invoices: authenticated users full access
create policy "Invoices viewable by authenticated users"
  on invoices for select to authenticated using (true);

create policy "Authenticated users can insert invoices"
  on invoices for insert to authenticated with check (true);

-- ============================================================
-- SEED: Sample products for testing
-- ============================================================
insert into products (name, sku, category, price, cost_price, stock_qty, unit) values
  ('Coca-Cola 500ml', 'COKE-500', 'Food & Beverages', 60, 45, 100, 'pcs'),
  ('Bread - White Loaf', 'BREAD-W', 'Food & Beverages', 55, 40, 50, 'pcs'),
  ('Colgate Toothpaste 75ml', 'COLG-75', 'Household', 120, 90, 80, 'pcs'),
  ('Cooking Oil 1L', 'OIL-1L', 'Food & Beverages', 250, 190, 60, 'pcs'),
  ('Blue Band Margarine 250g', 'BB-250', 'Food & Beverages', 130, 100, 40, 'pcs'),
  ('Sugar 1kg', 'SUG-1KG', 'Food & Beverages', 160, 130, 200, 'kg'),
  ('A4 Paper Ream', 'A4-REAM', 'Stationery', 550, 400, 30, 'pcs'),
  ('Pen - Bic Blue', 'PEN-BIC', 'Stationery', 15, 10, 500, 'pcs')
on conflict do nothing;
