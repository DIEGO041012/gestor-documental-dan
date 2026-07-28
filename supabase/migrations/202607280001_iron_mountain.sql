-- Inventario externo de Iron Mountain: 15 columnas de carpetas y 7 de cajas.
create extension if not exists pgcrypto;

create table if not exists public.iron_mountain_cajas (
  id uuid primary key default gen_random_uuid(),
  caja text not null unique,
  cliente text,
  codigo_alterno text,
  registro_inicial text,
  estado text,
  descripcion text,
  sucursal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.iron_mountain_carpetas (
  id uuid primary key default gen_random_uuid(),
  carpeta text not null unique,
  cliente text,
  alterno text,
  registro_inicial text,
  estado text,
  caja text,
  descripcion text,
  campo_usuario_1 text,
  campo_usuario_2 text,
  fecha_desde text,
  fecha_hasta text,
  consecutivo_desde text,
  consecutivo_hasta text,
  alterno_contenedor text,
  sucursal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists iron_mountain_carpetas_caja_idx on public.iron_mountain_carpetas(caja);
create index if not exists iron_mountain_carpetas_estado_idx on public.iron_mountain_carpetas(estado);
create index if not exists iron_mountain_cajas_estado_idx on public.iron_mountain_cajas(estado);

alter table public.iron_mountain_cajas enable row level security;
alter table public.iron_mountain_carpetas enable row level security;

drop policy if exists "iron cajas acceso anonimo" on public.iron_mountain_cajas;
create policy "iron cajas acceso anonimo" on public.iron_mountain_cajas for all to anon using (true) with check (true);
drop policy if exists "iron carpetas acceso anonimo" on public.iron_mountain_carpetas;
create policy "iron carpetas acceso anonimo" on public.iron_mountain_carpetas for all to anon using (true) with check (true);

grant select, insert, update, delete on public.iron_mountain_cajas to anon;
grant select, insert, update, delete on public.iron_mountain_carpetas to anon;
