-- Historial de cajas y documentos enviados a destrucción. Los registros pueden
-- venir de Documentación general (origen = 'archivo_general') o ingresarse a
-- mano cuando la caja o el documento no estaba registrado (origen = 'manual').
create extension if not exists pgcrypto;

create table if not exists public.destruccion_documental (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'caja' check (tipo in ('caja', 'documento')),
  "año" text,
  numero_caja text,
  ubicacion text,
  mes integer check (mes is null or mes between 1 and 12),
  area text,
  contenido text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'destruido')),
  motivo text,
  responsable text,
  numero_acta text,
  fecha_envio date not null default current_date,
  fecha_destruccion date,
  observaciones text,
  origen text not null default 'manual' check (origen in ('manual', 'archivo_general')),
  origen_id uuid,
  datos_origen jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists destruccion_documental_estado_idx on public.destruccion_documental(estado);
create index if not exists destruccion_documental_numero_caja_idx on public.destruccion_documental(numero_caja);
create index if not exists destruccion_documental_fecha_envio_idx on public.destruccion_documental(fecha_envio desc);

alter table public.destruccion_documental enable row level security;
drop policy if exists authenticated_access on public.destruccion_documental;
create policy authenticated_access on public.destruccion_documental
  for all to authenticated using (true) with check (true);
revoke all on table public.destruccion_documental from anon, public;
grant select, insert, update, delete on table public.destruccion_documental to authenticated;

-- Traslada una caja de Documentación general al historial de destrucción en
-- una sola transacción: si falla el insert, la caja no se elimina.
create or replace function public.enviar_caja_a_destruccion(
  p_caja_id uuid,
  p_motivo text default null,
  p_responsable text default null,
  p_numero_acta text default null,
  p_fecha_envio date default null,
  p_observaciones text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caja public.archivo_general%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión autenticada';
  end if;

  delete from public.archivo_general where id = p_caja_id returning * into v_caja;
  if not found then
    raise exception 'No se encontró la caja en Documentación general';
  end if;

  insert into public.destruccion_documental (
    tipo, "año", numero_caja, ubicacion, mes, area, contenido,
    motivo, responsable, numero_acta, fecha_envio, observaciones,
    origen, origen_id, datos_origen
  ) values (
    'caja', v_caja."año"::text, v_caja.numero_caja::text, v_caja.ubicacion::text,
    case when v_caja.mes::text ~ '^\d{1,2}$' and v_caja.mes::text::integer between 1 and 12 then v_caja.mes::text::integer end,
    v_caja.area::text, v_caja.contenido::text,
    nullif(trim(p_motivo), ''), nullif(trim(p_responsable), ''), nullif(trim(p_numero_acta), ''),
    coalesce(p_fecha_envio, current_date), nullif(trim(p_observaciones), ''),
    'archivo_general', v_caja.id::text::uuid, to_jsonb(v_caja)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enviar_caja_a_destruccion(uuid, text, text, text, date, text) from public, anon;
grant execute on function public.enviar_caja_a_destruccion(uuid, text, text, text, date, text) to authenticated;

notify pgrst, 'reload schema';
