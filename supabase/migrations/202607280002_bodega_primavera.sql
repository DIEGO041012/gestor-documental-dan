create extension if not exists pgcrypto;

create table if not exists public.bodega_primavera (
  id uuid primary key default gen_random_uuid(),
  "año" text,
  numero_caja text,
  ubicacion text,
  mes integer check (mes is null or mes between 1 and 12),
  area text,
  contenido text,
  estado text,
  origen_id uuid,
  fecha_traslado timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bodega_primavera_numero_caja_idx on public.bodega_primavera(numero_caja);
create index if not exists bodega_primavera_area_idx on public.bodega_primavera(area);
create index if not exists bodega_primavera_anio_idx on public.bodega_primavera("año");

alter table public.bodega_primavera enable row level security;
drop policy if exists "bodega primavera acceso anonimo" on public.bodega_primavera;
create policy "bodega primavera acceso anonimo" on public.bodega_primavera for all to anon using (true) with check (true);
grant select, insert, update, delete on public.bodega_primavera to anon;

notify pgrst, 'reload schema';
