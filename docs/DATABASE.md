# DATABASE — Supabase Schema Rejasi

> Stack: Vite + TypeScript + Supabase (PostgreSQL)
> Qaror sanasi: 18-sentabr 2026

---

## Joriy Holat va Rejalangan O'zgarishlar

```
table_sessions   [MAVJUD → YANGILANADI]
bar_items        [YANGI]
bar_orders       [YANGI]
daily_reports    [YANGI]
monthly_reports  [YANGI]
```

---

## 1. `table_sessions` — Yangilanadi

### Hozirgi Jadval
```sql
create table public.table_sessions (
  id            text primary key,
  table_id      integer not null,
  customer_name text not null default '',
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  duration_ms   bigint not null,
  amount        numeric(12, 2) not null default 0,
  created_at    timestamptz not null default now()
);
```

### Qo'shiladigan Ustunlar (Migration 002)
```sql
alter table public.table_sessions
  add column if not exists pause_duration_ms bigint       not null default 0,
  add column if not exists bar_amount        numeric(12,2) not null default 0,
  add column if not exists payment_method    text         not null default 'cash';

-- Computed column: o'yin + bar jami
alter table public.table_sessions
  add column if not exists total_amount numeric(12,2)
    generated always as (amount + bar_amount) stored;

comment on column public.table_sessions.pause_duration_ms
  is 'Seans ichidagi jami pauza davomiyligi (millisekund)';
comment on column public.table_sessions.bar_amount
  is 'Bar buyurtmalarining jami narxi (som)';
comment on column public.table_sessions.payment_method
  is 'cash yoki card';
comment on column public.table_sessions.total_amount
  is 'O''yin narxi + bar narxi (avtomatik hisoblanadi)';
```

### RLS Yangilanishi (Supabase Auth bilan)
```sql
-- Hozirgi anon policylarni o'chirish
drop policy if exists "allow billiard app to read sessions"  on public.table_sessions;
drop policy if exists "allow billiard app to save sessions"  on public.table_sessions;

-- Yangi policy: faqat tizimga kirgan foydalanuvchilar
create policy "authenticated_read"
  on public.table_sessions for select
  to authenticated using (true);

create policy "authenticated_insert"
  on public.table_sessions for insert
  to authenticated with check (true);
```

---

## 2. `bar_items` — Bar Mahsulotlari Katalogi (YANGI)

```sql
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

-- Barcha login qilganlar o'qiy oladi
create policy "authenticated_read"
  on public.bar_items for select
  to authenticated using (true);

-- Faqat admin yozadi (user_metadata da role = 'admin')
create policy "admin_insert"
  on public.bar_items for insert
  to authenticated
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_update"
  on public.bar_items for update
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

---

## 3. `bar_orders` — Seans Buyurtmalari (YANGI)

```sql
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

create policy "authenticated_read"
  on public.bar_orders for select
  to authenticated using (true);

create policy "authenticated_insert"
  on public.bar_orders for insert
  to authenticated with check (true);
```

---

## 4. `daily_reports` — Kunlik Hisobotlar Arxivi (YANGI)

```sql
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

-- Faqat admin ko'radi va yozadi
create policy "admin_all"
  on public.daily_reports for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

---

## 5. `monthly_reports` — Oylik Hisobotlar Arxivi (YANGI)

```sql
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

-- Faqat admin ko'radi va yozadi
create policy "admin_all"
  on public.monthly_reports for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

---

## 6. Auto-Delete: Supabase Edge Function

### Maqsad
- Har kuni 09:00 da: oldingi smena `daily_reports` ga arxivlanadi
- Har oyning 1-sanasida: avvalgi oy `monthly_reports` ga arxivlanadi
- `table_sessions` dan 30 kundan eski yozuvlar o'chiriladi

### Edge Function: `supabase/functions/daily-archive/index.ts`
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const todayShiftStart = new Date(now);
  todayShiftStart.setHours(9, 0, 0, 0);
  if (now < todayShiftStart) {
    todayShiftStart.setDate(todayShiftStart.getDate() - 1);
  }

  const prevShiftEnd = new Date(todayShiftStart);
  const prevShiftStart = new Date(todayShiftStart);
  prevShiftStart.setDate(prevShiftStart.getDate() - 1);

  // 1. Kechagi smenaning seanslarini yig'ish
  const { data: sessions } = await supabase
    .from('table_sessions')
    .select('amount, bar_amount, total_amount, payment_method')
    .gte('ended_at', prevShiftStart.toISOString())
    .lt('ended_at',  prevShiftEnd.toISOString());

  if (sessions && sessions.length > 0) {
    const gameRevenue = sessions.reduce((s, r) => s + Number(r.amount), 0);
    const barRevenue  = sessions.reduce((s, r) => s + Number(r.bar_amount), 0);
    const cashAmount  = sessions
      .filter(r => r.payment_method === 'cash')
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const cardAmount  = sessions
      .filter(r => r.payment_method === 'card')
      .reduce((s, r) => s + Number(r.total_amount), 0);

    // 2. daily_reports ga saqlash
    await supabase.from('daily_reports').upsert({
      report_date:     prevShiftStart.toISOString().slice(0, 10),
      shift_start:     prevShiftStart.toISOString(),
      shift_end:       prevShiftEnd.toISOString(),
      total_sessions:  sessions.length,
      game_revenue:    gameRevenue,
      bar_revenue:     barRevenue,
      cash_amount:     cashAmount,
      card_amount:     cardAmount
    }, { onConflict: 'report_date' });
  }

  // 3. Oylik tekshirish (1-sana bo'lsa)
  if (now.getDate() === 1) {
    // ... monthly_reports ga saqlash va table_sessions tozalash
  }

  // 4. table_sessions dan 30 kundan eski yozuvlarni o'chirish
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  await supabase
    .from('table_sessions')
    .delete()
    .lt('ended_at', cutoffDate.toISOString());

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

### pg_cron (Har kuni 09:00 Toshkent = 04:00 UTC)
```sql
-- Supabase Dashboard > SQL Editor da ishga tushirish
select cron.schedule(
  'daily-shift-archive',
  '0 4 * * *',
  $$
    select net.http_post(
      url     := 'https://rhkvyumrhrkokcqlxirw.supabase.co/functions/v1/daily-archive',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    )
  $$
);
```

> **MUHIM XAVFSIZLIK:**
> Service Role Key HECH QACHON client kodida ishlatilmaydi!
> Faqat Edge Function ichida `SUPABASE_SERVICE_ROLE_KEY` environment variable sifatida.

---

## Migratsiya Fayllari Tartibi

```
supabase/migrations/
├── 001_init.sql          ← Boshlangich table_sessions (hozirgi holat)
├── 002_sessions_v2.sql   ← pause_duration_ms, bar_amount, payment_method qo'shish
├── 003_bar.sql           ← bar_items, bar_orders
└── 004_reports.sql       ← daily_reports, monthly_reports
```

---

## .env Fayl

```env
# .env (git ga yuklanmaydi!)
VITE_SUPABASE_URL=https://rhkvyumrhrkokcqlxirw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Edge Function uchun (Supabase Dashboard > Settings > API)
# SUPABASE_SERVICE_ROLE_KEY — faqat Supabase Dashboard da saqlang
```

```env
# .env.example (git ga yuklanadi — namuna)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
