-- Las deudas de tarjeta no reducen el capital personal hasta que se paga una cuota.
-- Continúan apareciendo completas en el indicador e historial de deuda.
begin;

alter table finance_private.debt_history
  add column if not exists debt_type text not null default 'other';

-- Recupera el tipo actual para los registros históricos de deudas que siguen activas.
update finance_private.debt_history h
set debt_type = d.debt_type
from public.debts d
where h.user_id = d.user_id and h.debt_id = d.id;

create or replace function finance_private.track_debt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.debts%rowtype;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'No se puede cambiar el propietario.';
  end if;
  insert into finance_private.debt_history(
    user_id, debt_id, outstanding_amount, monthly_payment, currency, status, debt_type, deleted
  ) values (
    r.user_id, r.id, r.outstanding_amount, r.monthly_payment, r.currency, r.status, r.debt_type, tg_op = 'DELETE'
  );
  return r;
end $$;

create or replace function finance_private.cash_basis_net_worth() returns trigger
language plpgsql security definer set search_path = '' as $$
declare liabilities numeric;
begin
  if new.debt_history_available then
    select coalesce(sum(outstanding_amount * case when currency = 'USD' then 3.75 else 1 end), 0)
      into liabilities
    from (
      select distinct on (debt_id) outstanding_amount, currency, status, debt_type, deleted
      from finance_private.debt_history
      where user_id = new.user_id
        and recorded_at < ((new.month + interval '1 month')::date::timestamp at time zone 'America/Lima')
      order by debt_id, recorded_at desc, revision desc
    ) latest
    where not deleted and status = 'active' and debt_type <> 'credit_card';
    new.net_worth := new.accumulated_balance + new.investments - liabilities;
  end if;
  return new;
end $$;
revoke all on function finance_private.cash_basis_net_worth() from public, anon, authenticated;
drop trigger if exists monthly_cash_basis_net_worth on public.monthly_reports;
create trigger monthly_cash_basis_net_worth before insert on public.monthly_reports
  for each row execute function finance_private.cash_basis_net_worth();

commit;
