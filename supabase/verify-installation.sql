-- Diagnóstico de solo lectura: no muestra movimientos ni cambia datos.
select 'Tabla: ' || name as componente,
       to_regclass('public.' || name) is not null as disponible
from unnest(array['transactions','debts','debt_payments',
                  'investment_statements','monthly_reports']) as t(name)
union all
select 'Campo: ' || name,
       exists (select 1 from information_schema.columns c
               where c.table_schema = 'public'
                 and c.table_name = 'transactions'
                 and c.column_name = t.name)
from unnest(array['merchant','payment_method']) as t(name)
union all
select 'Función: cierre mensual',
       to_regprocedure('finance_private.close_months()') is not null
union all
select 'Extensión: pg_cron',
       exists (select 1 from pg_extension where extname = 'pg_cron');
