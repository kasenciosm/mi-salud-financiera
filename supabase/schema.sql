-- Ejecuta todo este archivo en Supabase > SQL Editor.
-- Las políticas RLS aíslan completamente los registros de cada usuario.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  description text not null default '',
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  exchange_rate numeric(10,4) not null default 1 check (exchange_rate > 0),
  source text not null default 'manual' check (source in ('manual', 'debt_payment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creditor text not null,
  original_amount numeric(14,2) not null check (original_amount > 0),
  outstanding_amount numeric(14,2) not null check (outstanding_amount >= 0),
  monthly_payment numeric(14,2) not null default 0 check (monthly_payment >= 0),
  annual_rate numeric(8,4) not null default 0 check (annual_rate >= 0),
  due_day smallint check (due_day between 1 and 31),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  status text not null default 'active' check (status in ('active', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  payment_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.investment_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  statement_date date not null,
  institution text not null default 'Grupo Coril',
  contributed_capital numeric(14,2) not null default 0 check (contributed_capital >= 0),
  market_value numeric(14,2) not null default 0 check (market_value >= 0),
  dividends numeric(14,2) not null default 0 check (dividends >= 0),
  cash_balance numeric(14,2) not null default 0 check (cash_balance >= 0),
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists debts_user_idx on public.debts(user_id);
create index if not exists debt_payments_user_date_idx on public.debt_payments(user_id, payment_date desc);
create index if not exists statements_user_date_idx on public.investment_statements(user_id, statement_date desc);

alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.investment_statements enable row level security;

revoke all on public.transactions, public.debts, public.debt_payments, public.investment_statements from anon;
grant select, insert, update, delete on public.transactions, public.debts, public.debt_payments, public.investment_statements to authenticated;

drop policy if exists "transactions_propias" on public.transactions;
create policy "transactions_propias" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "deudas_propias" on public.debts;
create policy "deudas_propias" on public.debts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "pagos_propios" on public.debt_payments;
create policy "pagos_propios" on public.debt_payments for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.debts
      where debts.id = debt_id and debts.user_id = (select auth.uid())
    )
  );

drop policy if exists "estados_propios" on public.investment_statements;
create policy "estados_propios" on public.investment_statements for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Registra el pago, crea su egreso y reduce la deuda dentro de una sola transacción.
create or replace function public.register_debt_payment(
  p_debt_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_notes text default ''
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_transaction_id uuid;
  v_payment_id uuid;
  v_new_balance numeric;
begin
  if v_user_id is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El pago debe ser mayor que cero.'; end if;

  select * into v_debt
  from public.debts
  where id = p_debt_id and user_id = v_user_id
  for update;

  if not found then raise exception 'Deuda no encontrada.'; end if;
  if v_debt.status = 'paid' or v_debt.outstanding_amount <= 0 then raise exception 'La deuda ya está pagada.'; end if;

  v_new_balance := greatest(v_debt.outstanding_amount - p_amount, 0);

  insert into public.transactions (
    user_id, date, type, category, description, amount, currency, exchange_rate, source
  ) values (
    v_user_id, p_payment_date, 'expense', 'Pago de deuda', v_debt.creditor,
    p_amount, v_debt.currency, 1, 'debt_payment'
  ) returning id into v_transaction_id;

  insert into public.debt_payments (
    user_id, debt_id, transaction_id, payment_date, amount, notes
  ) values (
    v_user_id, p_debt_id, v_transaction_id, p_payment_date, p_amount, coalesce(p_notes, '')
  ) returning id into v_payment_id;

  update public.debts
  set outstanding_amount = v_new_balance,
      status = case when v_new_balance = 0 then 'paid' else 'active' end,
      updated_at = now()
  where id = p_debt_id and user_id = v_user_id;

  return v_payment_id;
end;
$$;

revoke all on function public.register_debt_payment(uuid, numeric, date, text) from public, anon;
grant execute on function public.register_debt_payment(uuid, numeric, date, text) to authenticated;
