-- Actualización aditiva: conserva deudas y pagos existentes.
begin;

alter table public.debts
  add column if not exists debt_type text not null default 'other',
  add column if not exists installment_count smallint not null default 0,
  add column if not exists installments_paid smallint not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.debts'::regclass and conname = 'debts_debt_type_check') then
    alter table public.debts add constraint debts_debt_type_check check (debt_type in ('other', 'credit_card'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.debts'::regclass and conname = 'debts_installment_count_check') then
    alter table public.debts add constraint debts_installment_count_check check (installment_count between 0 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.debts'::regclass and conname = 'debts_installments_paid_check') then
    alter table public.debts add constraint debts_installments_paid_check check (installments_paid between 0 and 120);
  end if;
end $$;

alter table public.debt_payments
  add column if not exists principal_paid numeric(14,2) not null default 0,
  add column if not exists interest_paid numeric(14,2) not null default 0;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.debt_payments'::regclass and conname = 'debt_payments_principal_paid_check') then
    alter table public.debt_payments add constraint debt_payments_principal_paid_check check (principal_paid >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.debt_payments'::regclass and conname = 'debt_payments_interest_paid_check') then
    alter table public.debt_payments add constraint debt_payments_interest_paid_check check (interest_paid >= 0);
  end if;
end $$;

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
  v_interest numeric := 0;
  v_principal numeric;
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

  if v_debt.debt_type = 'credit_card' then
    v_interest := round(v_debt.outstanding_amount * v_debt.annual_rate / 1200, 2);
    if p_amount < v_debt.monthly_payment and p_amount < v_debt.outstanding_amount + v_interest then
      raise exception 'Para registrar una cuota, ingresa al menos % %.', v_debt.monthly_payment, v_debt.currency;
    end if;
    v_principal := least(v_debt.outstanding_amount, greatest(p_amount - v_interest, 0));
  else
    v_principal := least(v_debt.outstanding_amount, p_amount);
  end if;
  v_new_balance := greatest(v_debt.outstanding_amount - v_principal, 0);

  insert into public.transactions (
    user_id, date, type, category, description, amount, currency, exchange_rate, source
  ) values (
    v_user_id, p_payment_date, 'expense', 'Pago de deuda', v_debt.creditor,
    p_amount, v_debt.currency, 1, 'debt_payment'
  ) returning id into v_transaction_id;

  insert into public.debt_payments (
    user_id, debt_id, transaction_id, payment_date, amount, principal_paid, interest_paid, notes
  ) values (
    v_user_id, p_debt_id, v_transaction_id, p_payment_date, p_amount, v_principal, v_interest, coalesce(p_notes, '')
  ) returning id into v_payment_id;

  update public.debts
  set outstanding_amount = v_new_balance,
      installments_paid = case when v_debt.debt_type = 'credit_card' then least(installment_count, installments_paid + 1) else installments_paid end,
      status = case when v_new_balance = 0 then 'paid' else 'active' end,
      updated_at = now()
  where id = p_debt_id and user_id = v_user_id;

  return v_payment_id;
end;
$$;

revoke all on function public.register_debt_payment(uuid, numeric, date, text) from public, anon;
grant execute on function public.register_debt_payment(uuid, numeric, date, text) to authenticated;

commit;
