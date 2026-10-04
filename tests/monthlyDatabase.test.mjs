import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const root = new URL('../', import.meta.url);
await db.exec(`
create role anon; create role authenticated;
create schema auth;
create table auth.users(id uuid primary key, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
create schema test_clock;
create table test_clock.time(value timestamptz);
insert into test_clock.time values('2026-08-25T12:00:00Z');
create function test_clock.now() returns timestamptz language sql as $$select value from test_clock.time$$;
create schema cron;
create table cron.job(name text primary key, schedule text, command text);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job values($1,$2,$3) on conflict(name) do update set schedule=$2,command=$3 returning 1::bigint$$;
`);
await db.exec(await fs.readFile(new URL('supabase/schema.sql', root), 'utf8'));
// También debe funcionar sobre una instalación anterior, sin cambiar filas ni RLS.
await db.exec(`alter table public.transactions drop column merchant; alter table public.transactions drop column payment_method;
alter table public.debts drop column debt_type; alter table public.debts drop column installment_count; alter table public.debts drop column installments_paid;
alter table public.debt_payments drop column principal_paid; alter table public.debt_payments drop column interest_paid;`);
const identityMigration = await fs.readFile(new URL('supabase/transaction-identity.sql', root), 'utf8');
await db.exec(identityMigration);
await db.exec(identityMigration);
const debtMigration = await fs.readFile(new URL('supabase/tarjetas-cuotas.sql', root), 'utf8');
await db.exec(debtMigration);
await db.exec(debtMigration);
assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.transactions'::regclass")).rows[0].relrowsecurity,true);
const u='11111111-1111-1111-1111-111111111111', v='22222222-2222-2222-2222-222222222222', w='44444444-4444-4444-4444-444444444444';
const d='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
await db.exec(`
insert into auth.users values('${u}','2026-08-01'),('${v}','2026-08-01'),('${w}','2026-08-01');
insert into public.transactions(user_id,date,type,category,amount,currency,exchange_rate) values
('${u}','2026-08-05','income','Sueldo',1000,'PEN',1),
('${u}','2026-08-06','expense','Comida',1200,'PEN',1),
('${u}','2026-08-07','income','Venta USD',100,'USD',3.8),
('${u}','2026-09-10','income','Futuro',9999,'PEN',1),
('${v}','2026-08-01','income','Privado',777,'PEN',1);
insert into public.debts(id,user_id,creditor,original_amount,outstanding_amount,monthly_payment,annual_rate,debt_type,installment_count,currency)
values('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','${w}','Diners Club',12000,12000,1066.19,12,'credit_card',12,'PEN');
insert into public.debts(id,user_id,creditor,original_amount,outstanding_amount,monthly_payment,currency) values
('${d}','${u}','Banco',2000,1000,100,'USD');
insert into public.debts(id,user_id,creditor,original_amount,outstanding_amount,monthly_payment,annual_rate,debt_type,installment_count,currency)
values('cccccccc-cccc-cccc-cccc-cccccccccccc','${u}','Diners Club',2000,2000,400,12,'credit_card',6,'PEN');
insert into public.investment_statements(user_id,statement_date,market_value,cash_balance) values
('${u}','2026-08-20',1000,100),('${u}','2026-09-10',99999,0);
`);
await db.exec(`set role authenticated; set test.uid='${w}';`);
await assert.rejects(db.exec("select public.register_debt_payment('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',100,'2026-08-05','pago parcial')"), /ingresa al menos/);
await db.exec("select public.register_debt_payment('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',1066.19,'2026-08-05','cuota 1'); reset role;");
const [cardBalance] = (await db.query(`select outstanding_amount, installments_paid, status from public.debts where creditor='Diners Club' and user_id='${w}'`)).rows;
assert.equal(Number(cardBalance.outstanding_amount),11053.81);
assert.equal(cardBalance.installments_paid,1);
assert.equal(cardBalance.status,'active');
const [cardPayment] = (await db.query("select principal_paid, interest_paid from public.debt_payments where notes='cuota 1'")).rows;
assert.equal(Number(cardPayment.principal_paid),946.19);
assert.equal(Number(cardPayment.interest_paid),120);
const migration = (await fs.readFile(new URL('supabase/monthly-reports.sql', root),'utf8'))
  .replaceAll('clock_timestamp()', 'test_clock.now()')
  .replace('create extension if not exists pg_cron;', '-- pg_cron scheduler mocked; real SQL functions execute in Postgres.');
await db.exec(migration);
const cardCapitalMigration = await fs.readFile(new URL('supabase/tarjetas-no-afectan-capital.sql', root), 'utf8');
await db.exec(cardCapitalMigration);
await db.exec(cardCapitalMigration);
const query = async sql => (await db.query(sql)).rows;
assert.equal((await query("select merchant, payment_method from public.transactions limit 1"))[0].merchant,'');
const check = async (name, fn) => { await fn(); console.log(`PASS ${name}`); };
await check('No cierra agosto antes de medianoche en Lima',async()=>{
  await db.exec("update test_clock.time set value='2026-09-01T04:59:59Z'; select finance_private.close_months();");
  assert.equal((await query('select * from public.monthly_reports')).length,0);
});
await db.exec("update test_clock.time set value='2026-09-01T05:00:00Z';");
await check('Bloquea retroactividad incluso antes de ejecutarse Cron',async()=>{
  await assert.rejects(db.exec(`insert into public.transactions(user_id,date,type,category,amount) values('${u}','2026-08-31','expense','Tardío',1)`),/cerrado/);
});
await db.exec(`update public.debts set outstanding_amount=500 where id='${d}';`);
await check('Cierre retrasado conserva deuda e inversiones al fin de agosto',async()=>{
  await db.exec('select finance_private.close_months();');
  const [r]=await query(`select * from public.monthly_reports where user_id='${u}'`);
  assert.equal(Number(r.income),1380); assert.equal(Number(r.expenses),1200);
  assert.equal(Number(r.cash_flow),180); assert.equal(Number(r.accumulated_balance),180);
  assert.equal(Number(r.debt),5750); assert.equal(Number(r.investments),1100);
  assert.equal(Number(r.net_worth),-2470);
});
await check('Reejecutar no duplica ni sobrescribe reportes',async()=>{
  const before=await query('select * from public.monthly_reports order by user_id');
  await db.exec('select finance_private.close_months();');
  assert.deepEqual(await query('select * from public.monthly_reports order by user_id'),before);
});
await check('No permite mover o borrar registros de un periodo cerrado',async()=>{
  await assert.rejects(db.exec(`update public.transactions set date='2026-09-01' where user_id='${u}' and date='2026-08-05'`),/cerrado/);
  await assert.rejects(db.exec(`delete from public.investment_statements where statement_date='2026-08-20'`),/cerrado/);
});
await check('RLS muestra solo los reportes del propietario y niega escrituras',async()=>{
  await db.exec(`set role authenticated; set test.uid='${u}';`);
  assert.equal((await query('select * from public.monthly_reports')).length,1);
  await assert.rejects(db.exec('delete from public.monthly_reports'),/permission denied/);
  await assert.rejects(db.exec('select finance_private.close_months()'),/permission denied/);
  await db.exec('reset role');
});
await check('Recupera meses sin actividad y no crea reportes futuros',async()=>{
  await db.exec("update test_clock.time set value='2026-12-01T05:00:00Z'; select finance_private.close_months();");
  const rows=await query(`select * from public.monthly_reports where user_id='${u}' order by month`);
  assert.equal(rows.length,4); assert.equal(Number(rows[3].income),0);
  assert.equal(Number(rows[3].cash_flow),0); assert.equal(rows[3].savings_rate,null);
  assert.equal(Number(rows[3].debt),3875);
});
await check('Deuda histórica previa a la activación queda no disponible',async()=>{
  await db.exec(`insert into auth.users values('33333333-3333-3333-3333-333333333333','2026-08-01'); update finance_private.settings set enabled_at='2026-10-15'; select finance_private.close_months();`);
  const [r]=await query("select * from public.monthly_reports where user_id='33333333-3333-3333-3333-333333333333' and month='2026-08-01'");
  assert.equal(r.debt,null); assert.equal(r.net_worth,null); assert.equal(r.score,null); assert.equal(r.debt_history_available,false);
});
await check('Migración reejecutable conserva cierres y configura un solo trabajo',async()=>{
  const before=await query('select * from public.monthly_reports order by user_id,month');
  await db.exec(migration);
  assert.deepEqual(await query('select * from public.monthly_reports order by user_id,month'),before);
  assert.equal((await query('select * from cron.job')).length,1);
});
await db.close();
