-- Enable required extensions
create extension if not exists pgcrypto;

-- 1) Extend app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('admin','moderator','user','financier');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'merchant';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'agent';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Visits analytics table
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  path text not null,
  referrer text,
  user_agent text,
  user_id uuid references auth.users(id)
);
alter table public.visits enable row level security;
-- Allow inserts by anyone (logged or not)
create policy if not exists visits_insert_any on public.visits for insert to anon, authenticated using (true) with check (true);
-- Allow reads to admins/financiers/merchants
create policy if not exists visits_select_admin on public.visits for select to authenticated using (
  public.has_role('admin', auth.uid())
  or public.has_role('financier', auth.uid())
  or public.has_role('merchant', auth.uid())
);

-- 3) Fees ledger and augment wallet_transactions
create table if not exists public.fees_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  transaction_id uuid references public.wallet_transactions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  agent_id uuid references auth.users(id) on delete set null,
  operation text not null check (operation in ('withdraw','transfer')),
  base_amount numeric not null check (base_amount > 0),
  fee_rate numeric not null check (fee_rate >= 0),
  fee_amount numeric not null check (fee_amount >= 0),
  agent_commission numeric not null default 0,
  platform_fee numeric not null default 0
);
alter table public.fees_ledger enable row level security;
create policy if not exists fees_select_admin on public.fees_ledger for select to authenticated using (
  public.has_role('admin', auth.uid()) or public.has_role('financier', auth.uid())
);

-- Add acted_by and fee_amount to wallet_transactions (nullable)
DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS acted_by uuid references auth.users(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS fee_amount numeric;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 4) Tontine core
create type if not exists tontine_frequency as enum ('daily','weekly','monthly','custom');
create type if not exists tontine_status as enum ('active','paused','completed');

create table if not exists public.tontines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  creator_id uuid not null references auth.users(id),
  name text not null,
  amount_per_cycle numeric not null check (amount_per_cycle > 0),
  max_participants int not null check (max_participants > 0),
  frequency tontine_frequency not null,
  start_date timestamptz not null,
  status tontine_status not null default 'active'
);
alter table public.tontines enable row level security;
create policy if not exists tontines_read_all on public.tontines for select using (true);
create policy if not exists tontines_insert_auth on public.tontines for insert to authenticated using (true) with check (auth.uid() = creator_id);
create policy if not exists tontines_update_owner on public.tontines for update to authenticated using (auth.uid() = creator_id);

create table if not exists public.tontine_members (
  tontine_id uuid references public.tontines(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  moissonneur_code text,
  has_won boolean not null default false,
  primary key (tontine_id, user_id)
);
alter table public.tontine_members enable row level security;
create policy if not exists tontine_members_read_participants on public.tontine_members for select using (true);
create policy if not exists tontine_members_insert_auth on public.tontine_members for insert to authenticated using (true) with check (auth.uid() = user_id);

create table if not exists public.tontine_rounds (
  id uuid primary key default gen_random_uuid(),
  tontine_id uuid not null references public.tontines(id) on delete cascade,
  round_number int not null,
  draw_date timestamptz not null default now(),
  winner_user_id uuid references auth.users(id),
  unique (tontine_id, round_number)
);
alter table public.tontine_rounds enable row level security;
create policy if not exists tontine_rounds_read_all on public.tontine_rounds for select using (true);

create table if not exists public.tontine_payments (
  id uuid primary key default gen_random_uuid(),
  tontine_id uuid not null references public.tontines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  transaction_id uuid references public.wallet_transactions(id),
  created_at timestamptz not null default now()
);
alter table public.tontine_payments enable row level security;
create policy if not exists tontine_payments_member_read on public.tontine_payments for select using (
  exists (select 1 from public.tontine_members m where m.tontine_id = tontine_id and m.user_id = auth.uid())
);
create policy if not exists tontine_payments_member_insert on public.tontine_payments for insert to authenticated with check (
  exists (select 1 from public.tontine_members m where m.tontine_id = tontine_id and m.user_id = auth.uid())
);

-- 5) Chat minimal
create type if not exists chat_room_type as enum ('private','group','tontine');
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type chat_room_type not null,
  name text,
  created_by uuid references auth.users(id),
  tontine_id uuid references public.tontines(id)
);
alter table public.chat_rooms enable row level security;
create policy if not exists chat_rooms_read_all on public.chat_rooms for select using (true);

create table if not exists public.chat_members (
  room_id uuid references public.chat_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.chat_members enable row level security;
create policy if not exists chat_members_read_self on public.chat_members for select using (true);
create policy if not exists chat_members_insert_self on public.chat_members for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy if not exists chat_messages_member_read on public.chat_messages for select using (
  exists (select 1 from public.chat_members cm where cm.room_id = room_id and cm.user_id = auth.uid())
);
create policy if not exists chat_messages_member_insert on public.chat_messages for insert to authenticated with check (
  exists (select 1 from public.chat_members cm where cm.room_id = room_id and cm.user_id = auth.uid())
);

-- 6) Shops (Ma Boutique)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  banner_url text,
  is_active boolean not null default true
);
alter table public.shops enable row level security;
create policy if not exists shops_public_read on public.shops for select using (is_active);
create policy if not exists shops_owner_crud on public.shops for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create type if not exists product_type as enum ('physical','digital');
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  stock int not null default 0,
  type product_type not null,
  images text[],
  files text[],
  is_active boolean not null default true
);
alter table public.shop_products enable row level security;
create policy if not exists shop_products_public_read on public.shop_products for select using (
  is_active and exists (select 1 from public.shops s where s.id = shop_id and s.is_active)
);
create policy if not exists shop_products_owner_crud on public.shop_products for all to authenticated using (
  exists (select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid())
);

create type if not exists order_status_shop as enum ('pending','paid','delivered','cancelled');
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.shop_products(id) on delete restrict,
  buyer_id uuid references auth.users(id),
  quantity int not null check (quantity > 0),
  amount numeric not null check (amount >= 0),
  status order_status_shop not null default 'pending',
  payment_method text,
  tx_ref text
);
alter table public.shop_orders enable row level security;
create policy if not exists shop_orders_owner_read on public.shop_orders for select to authenticated using (
  exists (select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid())
);
create policy if not exists shop_orders_buyer_read on public.shop_orders for select to authenticated using (buyer_id = auth.uid());

-- 7) Payment providers & crypto addresses
create table if not exists public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('mobile','crypto')),
  name text not null,
  details jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);
alter table public.payment_providers enable row level security;
create policy if not exists payment_providers_public_read on public.payment_providers for select using (is_active);

create table if not exists public.crypto_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  currency text not null check (currency in ('BTC','ETH','USDT')),
  address text not null,
  network text,
  is_active boolean not null default true
);
alter table public.crypto_addresses enable row level security;
create policy if not exists crypto_addresses_public_read on public.crypto_addresses for select using (is_active);

-- 8) Moissonneur fund withdrawals (admin-only write, public read)
create table if not exists public.moissonneur_fund_withdrawals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid not null references auth.users(id),
  amount numeric not null check (amount > 0),
  reason text,
  description text
);
alter table public.moissonneur_fund_withdrawals enable row level security;
create policy if not exists fund_withdrawals_public_read on public.moissonneur_fund_withdrawals for select using (true);
create policy if not exists fund_withdrawals_admin_insert on public.moissonneur_fund_withdrawals for insert to authenticated with check (
  public.has_role('admin', auth.uid()) or public.has_role('financier', auth.uid())
);
