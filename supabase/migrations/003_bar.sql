create table if not exists public.bar_items (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  price       numeric(10,2) not null default 0,
  category    text        not null default 'boshqa',
  -- Kategoriyalar: 'ichimlik', 'taom', 'boshqa'
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indeks: kategoriya bo'yicha filter uchun
create index if not exists bar_items_category_idx
  on public.bar_items (category) where is_active = true;

alter table public.bar_items enable row level security;

-- Barcha o'qiy oladi
create policy "public_read"
  on public.bar_items for select
  to public using (true);

-- Barcha yozishi mumkin
create policy "public_insert"
  on public.bar_items for insert
  to public
  with check (true);

create policy "public_update"
  on public.bar_items for update
  to public
  using (true);

create table if not exists public.bar_orders (
  id          uuid        primary key default gen_random_uuid(),
  session_id  text        not null
                references public.table_sessions(id) on delete cascade,
  item_id     uuid        not null
                references public.bar_items(id),
  item_name   text        not null,
  -- ↑ Snapshot: mahsulot nomi keyin o'zgarsa tarix buzilmasin
  item_price  numeric(10,2) not null,
  -- ↑ Snapshot: narx keyin o'zgarsa tarix buzilmasin
  quantity    integer     not null default 1 check (quantity > 0),
  subtotal    numeric(12,2)
    generated always as (item_price * quantity) stored,
  created_at  timestamptz not null default now()
);

create index if not exists bar_orders_session_id_idx
  on public.bar_orders (session_id);

alter table public.bar_orders enable row level security;

create policy "public_read"
  on public.bar_orders for select
  to public using (true);

create policy "public_insert"
  on public.bar_orders for insert
  to public with check (true);
