create table if not exists public.daily_reports (
  id              uuid        primary key default gen_random_uuid(),
  report_date     date        not null unique,
  -- ↑ Smena boshlangan kun (09:00 dakiqasidagi sana)
  shift_start     timestamptz not null,
  -- ↑ Bu kungi 09:00
  shift_end       timestamptz not null,
  -- ↑ Ertasi kuni 09:00
  total_sessions  integer     not null default 0,
  game_revenue    numeric(14,2) not null default 0,
  bar_revenue     numeric(14,2) not null default 0,
  total_revenue   numeric(14,2)
    generated always as (game_revenue + bar_revenue) stored,
  cash_amount     numeric(14,2) not null default 0,
  card_amount     numeric(14,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists daily_reports_date_idx
  on public.daily_reports (report_date desc);

alter table public.daily_reports enable row level security;

-- Barcha o'qiy oladi va yozadi
create policy "public_all"
  on public.daily_reports for all
  to public
  using (true)
  with check (true);

create table if not exists public.monthly_reports (
  id              uuid        primary key default gen_random_uuid(),
  year            integer     not null,
  month           integer     not null check (month between 1 and 12),
  report_label    text        not null,
  -- ↑ "Sentabr 2026" formatida
  total_sessions  integer     not null default 0,
  working_days    integer     not null default 0,
  game_revenue    numeric(16,2) not null default 0,
  bar_revenue     numeric(16,2) not null default 0,
  total_revenue   numeric(16,2)
    generated always as (game_revenue + bar_revenue) stored,
  cash_amount     numeric(16,2) not null default 0,
  card_amount     numeric(16,2) not null default 0,
  created_at      timestamptz not null default now(),

  unique(year, month)
);

create index if not exists monthly_reports_year_month_idx
  on public.monthly_reports (year desc, month desc);

alter table public.monthly_reports enable row level security;

-- Barcha o'qiy oladi va yozadi
create policy "public_all"
  on public.monthly_reports for all
  to public
  using (true)
  with check (true);
