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

-- RLS Yangilanishi
drop policy if exists "allow billiard app to read sessions"  on public.table_sessions;
drop policy if exists "allow billiard app to save sessions"  on public.table_sessions;

create policy "public_read"
  on public.table_sessions for select
  to public using (true);

create policy "public_insert"
  on public.table_sessions for insert
  to public with check (true);
