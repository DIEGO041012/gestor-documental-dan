create extension if not exists pgcrypto;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (
    'ENV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  carrier text not null default 'Coordinadora',
  guide_number text unique,
  status text not null default 'programado'
    check (status in ('programado', 'recogido', 'en_transito', 'en_reparto', 'entregado', 'novedad', 'devuelto', 'cancelado')),
  scheduled_pickup_at timestamptz not null,
  sender_name text not null,
  sender_phone text not null,
  origin_address text not null,
  origin_city text not null,
  recipient_name text not null,
  recipient_phone text not null,
  recipient_address text not null,
  recipient_city text not null,
  recipient_email text,
  package_type text not null check (package_type in ('sobre', 'caja', 'paquete', 'otro')),
  package_description text not null,
  weight_kg numeric(8, 2) check (weight_kg is null or weight_kg > 0),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text check (status is null or status in ('programado', 'recogido', 'en_transito', 'en_reparto', 'entregado', 'novedad', 'devuelto', 'cancelado')),
  description text not null,
  location text,
  source text not null default 'manual' check (source in ('manual', 'coordinadora')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  occurred_at timestamptz not null default now()
);

create index if not exists shipments_pickup_idx on public.shipments(scheduled_pickup_at desc);
create index if not exists shipments_status_idx on public.shipments(status);
create index if not exists shipments_recipient_idx on public.shipments(recipient_name);
create index if not exists shipment_events_route_idx on public.shipment_events(shipment_id, occurred_at desc);

do $$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array[
    'archivo_general',
    'bodega_primavera',
    'personal_activo',
    'personal_inactivo',
    'presidencia',
    'prestamos',
    'radicados',
    'tareas',
    'citas',
    'iron_mountain_cajas',
    'iron_mountain_carpetas',
    'shipments',
    'shipment_events'
  ] loop
    if to_regclass(format('public.%I', v_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', v_table);

    for v_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = v_table
    loop
      execute format('drop policy %I on public.%I', v_policy, v_table);
    end loop;

    execute format(
      'create policy authenticated_access on public.%I for all to authenticated using (true) with check (true)',
      v_table
    );
    execute format('revoke all on table public.%I from anon, public', v_table);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', v_table);
  end loop;
end $$;

revoke all on all sequences in schema public from anon, public;
grant usage, select on all sequences in schema public to authenticated;

revoke update, delete on public.shipment_events from authenticated;
grant select, insert on public.shipment_events to authenticated;

create or replace function public.add_initial_shipment_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.shipment_events (shipment_id, status, description, source, created_by)
  values (new.id, new.status, 'Envío programado en el gestor documental', 'manual', new.created_by);
  return new;
end;
$$;

drop trigger if exists shipment_initial_event on public.shipments;
create trigger shipment_initial_event
after insert on public.shipments
for each row execute function public.add_initial_shipment_event();

create or replace function public.register_shipment_event(
  p_shipment_id uuid,
  p_status text,
  p_description text,
  p_location text default null,
  p_guide_number text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada';
  end if;
  if p_status is not null and p_status not in ('programado', 'recogido', 'en_transito', 'en_reparto', 'entregado', 'novedad', 'devuelto', 'cancelado') then
    raise exception 'El estado del envío no es válido';
  end if;
  if nullif(trim(p_description), '') is null then
    raise exception 'El detalle de la actualización es obligatorio';
  end if;

  update public.shipments
  set status = coalesce(p_status, status),
      guide_number = coalesce(nullif(trim(p_guide_number), ''), guide_number),
      updated_at = now()
  where id = p_shipment_id;
  if not found then
    raise exception 'No se encontró el envío solicitado';
  end if;

  insert into public.shipment_events (shipment_id, status, description, location, source, created_by)
  values (p_shipment_id, p_status, trim(p_description), nullif(trim(p_location), ''), 'manual', auth.uid())
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.register_shipment_event(uuid, text, text, text, text) from public, anon;
grant execute on function public.register_shipment_event(uuid, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
