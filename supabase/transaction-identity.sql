-- Actualización aditiva. Conserva registros, importes, cierres y políticas RLS.
begin;
alter table public.transactions add column if not exists merchant text not null default '';
alter table public.transactions add column if not exists payment_method text not null default '';
notify pgrst, 'reload schema';
commit;
