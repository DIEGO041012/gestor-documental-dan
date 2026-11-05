-- Vincula cada préstamo con el registro prestado para mostrar el aviso de
-- "Prestado" en su sección. Los préstamos anteriores quedan sin vínculo.
alter table public.prestamos add column if not exists registro_tabla text;
alter table public.prestamos add column if not exists registro_id text;

alter table public.prestamos drop constraint if exists prestamos_registro_tabla_check;
alter table public.prestamos add constraint prestamos_registro_tabla_check check (
  registro_tabla is null or registro_tabla in ('archivo_general', 'bodega_primavera', 'personal_activo', 'personal_inactivo', 'presidencia')
);

-- Un mismo registro no puede tener dos préstamos activos a la vez
create unique index if not exists prestamos_registro_activo_uidx
  on public.prestamos(registro_tabla, registro_id)
  where estado = 'activo' and registro_id is not null;

-- Mantiene la columna "estado" de las cajas al prestar, devolver o eliminar un
-- préstamo, en la misma transacción. Las demás tablas no tienen esa columna.
create or replace function public.sincronizar_estado_prestamo()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' and old.estado = 'activo' and old.registro_id is not null
     and (tg_op = 'DELETE' or new.estado <> 'activo' or new.registro_id is distinct from old.registro_id or new.registro_tabla is distinct from old.registro_tabla) then
    if old.registro_tabla = 'archivo_general' then
      update public.archivo_general set estado = 'Disponible' where id::text = old.registro_id;
    elsif old.registro_tabla = 'bodega_primavera' then
      update public.bodega_primavera set estado = 'Disponible' where id::text = old.registro_id;
    end if;
  end if;

  if tg_op <> 'DELETE' and new.estado = 'activo' and new.registro_id is not null then
    if new.registro_tabla = 'archivo_general' then
      update public.archivo_general set estado = 'Prestado' where id::text = new.registro_id;
    elsif new.registro_tabla = 'bodega_primavera' then
      update public.bodega_primavera set estado = 'Prestado' where id::text = new.registro_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists prestamo_sincroniza_estado on public.prestamos;
create trigger prestamo_sincroniza_estado
after insert or update or delete on public.prestamos
for each row execute function public.sincronizar_estado_prestamo();

revoke all on function public.sincronizar_estado_prestamo() from public, anon;
grant execute on function public.sincronizar_estado_prestamo() to authenticated;

notify pgrst, 'reload schema';
