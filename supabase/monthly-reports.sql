-- Ejecutar UNA VEZ después de schema.sql, en Supabase > SQL Editor.
-- Reejecutable: conserva reportes y fecha de activación.
begin;
create schema if not exists finance_private;
revoke all on schema finance_private from public, anon, authenticated;

create table if not exists finance_private.settings (
  id boolean primary key default true check (id),
  enabled_at timestamptz not null default clock_timestamp()
);
insert into finance_private.settings(id) values(true) on conflict do nothing;

create table if not exists public.monthly_reports (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  closed_at timestamptz not null default clock_timestamp(),
  income numeric not null, expenses numeric not null,
  cash_flow numeric not null, accumulated_balance numeric not null,
  savings_rate numeric, debt numeric, monthly_debt_payment numeric,
  investments numeric not null, statement_date date,
  net_worth numeric, score integer,
  debt_history_available boolean not null,
  exchange_rate numeric not null default 3.75,
  primary key(user_id, month)
);
alter table public.monthly_reports enable row level security;
revoke all on public.monthly_reports from public, anon, authenticated;
grant select on public.monthly_reports to authenticated;
drop policy if exists reports_own on public.monthly_reports;
create policy reports_own on public.monthly_reports for select to authenticated
  using(user_id = (select auth.uid()));

-- Historial inmutable de deudas, incluso cuando se editan o eliminan.
create table if not exists finance_private.debt_history (
  revision bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null, recorded_at timestamptz not null default clock_timestamp(),
  outstanding_amount numeric not null, monthly_payment numeric not null,
  currency text not null, status text not null, deleted boolean not null default false
);
create index if not exists debt_history_lookup on finance_private.debt_history(user_id, debt_id, recorded_at desc, revision desc);
insert into finance_private.debt_history(user_id,debt_id,outstanding_amount,monthly_payment,currency,status)
select user_id,id,outstanding_amount,monthly_payment,currency,status from public.debts d
where not exists(select 1 from finance_private.debt_history h where h.debt_id=d.id);

create or replace function finance_private.track_debt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.debts%rowtype;
begin
  if tg_op='DELETE' then r := old; else r := new; end if;
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'No se puede cambiar el propietario.';
  end if;
  insert into finance_private.debt_history(user_id,debt_id,outstanding_amount,monthly_payment,currency,status,deleted)
  values(r.user_id,r.id,r.outstanding_amount,r.monthly_payment,r.currency,r.status,tg_op='DELETE');
  return r;
end $$;
drop trigger if exists monthly_debt_history on public.debts;
create trigger monthly_debt_history after insert or update or delete on public.debts
  for each row execute function finance_private.track_debt();

-- Bloquear escrituras retroactivas desde el cambio de mes, aunque Cron se retrase.
create or replace function finance_private.guard_closed_period() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cutoff date := date_trunc('month',clock_timestamp() at time zone 'America/Lima')::date;
  old_date date; new_date date;
begin
  if tg_op <> 'INSERT' then old_date := (to_jsonb(old)->>tg_argv[0])::date; end if;
  if tg_op <> 'DELETE' then new_date := (to_jsonb(new)->>tg_argv[0])::date; end if;
  if old_date < cutoff or new_date < cutoff then
    raise exception 'Este mes ya está cerrado. Registra el ajuste en el mes actual.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists monthly_lock on public.transactions;
create trigger monthly_lock before insert or update or delete on public.transactions
  for each row execute function finance_private.guard_closed_period('date');
drop trigger if exists monthly_lock on public.investment_statements;
create trigger monthly_lock before insert or update or delete on public.investment_statements
  for each row execute function finance_private.guard_closed_period('statement_date');
drop trigger if exists monthly_lock on public.debt_payments;
create trigger monthly_lock before insert or update or delete on public.debt_payments
  for each row execute function finance_private.guard_closed_period('payment_date');

-- Solo el dueño de la base puede ejecutar esta función. No recibe fechas del cliente.
create or replace function finance_private.close_months() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  current_month date := date_trunc('month',clock_timestamp() at time zone 'America/Lima')::date;
  enabled timestamptz; u record; m date; first_month date; end_date date; boundary timestamptz;
  inc numeric; exp numeric; balance numeric; debt_total numeric; debt_quota numeric;
  investment numeric; st_date date; history_ok boolean; available numeric; indicator integer;
  added integer := 0; inserted integer;
begin
  -- Evita duplicados entre ejecuciones simultáneas, sin sobreescribir cierres.
  if not pg_try_advisory_xact_lock(748310209) then return 0; end if;
  -- Espera escrituras previas y asegura una foto coherente de todas las tablas.
  lock table public.transactions, public.debts, public.debt_payments, public.investment_statements in share mode;
  select enabled_at into enabled from finance_private.settings where id;
  for u in select id,created_at from auth.users loop
    select date_trunc('month',least(
      (u.created_at at time zone 'America/Lima')::date,
      (select min(date) from public.transactions where user_id=u.id),
      (select min(statement_date) from public.investment_statements where user_id=u.id)
    ))::date into first_month;
    first_month := greatest(first_month,date '2026-08-01');
    for m in select generate_series(first_month::timestamp,(current_month-interval '1 month')::timestamp,interval '1 month')::date loop
      if exists(select 1 from public.monthly_reports where user_id=u.id and month=m) then continue; end if;
      end_date := (m+interval '1 month')::date;
      boundary := end_date::timestamp at time zone 'America/Lima';
      select
        coalesce(sum(amount*case when currency='USD' then exchange_rate else 1 end) filter(where type='income' and date>=m),0),
        coalesce(sum(amount*case when currency='USD' then exchange_rate else 1 end) filter(where type='expense' and date>=m),0),
        coalesce(sum(amount*case when currency='USD' then exchange_rate else 1 end*case when type='income' then 1 else -1 end),0)
      into inc,exp,balance from public.transactions where user_id=u.id and date<end_date;
      history_ok := enabled < boundary;
      debt_total := null; debt_quota := null;
      if history_ok then
        select coalesce(sum(outstanding_amount*case when currency='USD' then 3.75 else 1 end),0),
          coalesce(sum(monthly_payment*case when currency='USD' then 3.75 else 1 end),0)
        into debt_total,debt_quota from (
          select distinct on(debt_id) * from finance_private.debt_history
          where user_id=u.id and recorded_at<boundary
          order by debt_id,recorded_at desc,revision desc
        ) h where not deleted and status='active';
      end if;
      investment := null; st_date := null;
      -- Conserva la semántica de la app: último estado de cuenta registrado.
      select (market_value+cash_balance)*case when currency='USD' then 3.75 else 1 end,statement_date
      into investment,st_date from public.investment_statements
      where user_id=u.id and statement_date<end_date
      order by statement_date desc,created_at desc,id desc limit 1;
      investment := coalesce(investment,0);
      available := case when inc>0 then (inc-exp)/inc*100 else null end;
      indicator := case when not history_ok then null when inc<=0 then 0
        else round(least(100,greatest(0,55+greatest(0,available)*0.4-debt_quota/inc*100*0.35)))::integer end;
      insert into public.monthly_reports(user_id,month,income,expenses,cash_flow,accumulated_balance,savings_rate,
        debt,monthly_debt_payment,investments,statement_date,net_worth,score,debt_history_available)
      values(u.id,m,inc,exp,inc-exp,balance,available,debt_total,debt_quota,investment,st_date,
        case when history_ok then balance+investment-debt_total else null end,indicator,history_ok)
      on conflict(user_id,month) do nothing;
      get diagnostics inserted = row_count;
      added := added+inserted;
    end loop;
  end loop;
  return added;
end $$;
revoke all on all tables in schema finance_private from public,anon,authenticated;
revoke all on all functions in schema finance_private from public,anon,authenticated;
revoke all on all sequences in schema finance_private from public,anon,authenticated;

-- Cada hora: incluye 00:00 en Lima y recupera cierres pendientes tras una pausa.
create extension if not exists pg_cron;
select cron.schedule('finance-monthly-close','0 * * * *','select finance_private.close_months();');
select finance_private.close_months();
commit;
