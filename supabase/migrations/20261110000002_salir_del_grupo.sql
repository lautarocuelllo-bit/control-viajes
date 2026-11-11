-- =====================================================================
-- Salir de un grupo y quitar pasajeros
--
-- No se borra la fila de miembros: se marca la fecha de salida. Así el
-- chofer sigue viendo la deuda de quien se fue (y puede cobrarla), y si
-- la persona vuelve a unirse con el código, recupera su historial.
-- =====================================================================

alter table public.miembros add column salio_at timestamptz;

-- Solo cuenta como miembro quien no se fue
create or replace function public.es_miembro(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.grupo_id = p_grupo and m.perfil_id = (select auth.uid()) and m.salio_at is null
  );
$$;

-- El chofer sigue viendo el nombre de quien se fue; un pasajero que se fue
-- ya no ve a los demás
create or replace function public.comparto_grupo(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grupos g
    left join public.miembros m on m.grupo_id = g.id
    where
      -- soy chofer y la persona es (o fue) pasajera de mi grupo
      (g.chofer_id = (select auth.uid()) and m.perfil_id = p_perfil)
      -- soy pasajero y la persona es el chofer o pasajera de mi grupo
      or (m.perfil_id = (select auth.uid()) and m.salio_at is null and (g.chofer_id = p_perfil or exists (
            select 1 from public.miembros m2
            where m2.grupo_id = g.id and m2.perfil_id = p_perfil and m2.salio_at is null)))
  );
$$;

-- Saldos: columna nueva al final para saber si la persona sigue en el grupo
create or replace view public.saldos
with (security_invoker = true)
as
select
  m.grupo_id,
  m.perfil_id as pasajero_id,
  coalesce(v.total, 0)                                         as total_viajes,
  coalesce(v.cantidad, 0)                                      as cantidad_viajes,
  coalesce(p.total, 0)                                         as total_pagos,
  coalesce(v.total, 0) + coalesce(d.total, 0) - coalesce(p.total, 0) as saldo,
  coalesce(d.total, 0)                                         as deuda_anterior,
  m.salio_at is null                                           as activo
from public.miembros m
left join (
  select grupo_id, pasajero_id, sum(monto)::integer as total, count(*)::integer as cantidad
  from public.viajes where estado = 'confirmado'
  group by grupo_id, pasajero_id
) v on v.grupo_id = m.grupo_id and v.pasajero_id = m.perfil_id
left join (
  select grupo_id, pasajero_id, sum(monto)::integer as total
  from public.pagos where estado = 'confirmado'
  group by grupo_id, pasajero_id
) p on p.grupo_id = m.grupo_id and p.pasajero_id = m.perfil_id
left join (
  select grupo_id, pasajero_id, sum(monto)::integer as total
  from public.deudas_anteriores where estado = 'confirmado'
  group by grupo_id, pasajero_id
) d on d.grupo_id = m.grupo_id and d.pasajero_id = m.perfil_id;

-- Unirse: si la persona se había ido, vuelve con su historial
create or replace function public.unirse_a_grupo(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo public.grupos;
begin
  if (select auth.uid()) is null then
    raise exception 'Tenés que iniciar sesión';
  end if;

  select * into v_grupo from public.grupos where codigo = trim(p_codigo);
  if not found then
    raise exception 'No hay ningún grupo con ese código';
  end if;
  if v_grupo.chofer_id = (select auth.uid()) then
    raise exception 'Sos el chofer de este grupo';
  end if;

  insert into public.miembros (grupo_id, perfil_id)
  values (v_grupo.id, (select auth.uid()))
  on conflict (grupo_id, perfil_id) do update set salio_at = null, unido_at = now()
  where public.miembros.salio_at is not null;

  return v_grupo.id;
end;
$$;

-- Registrar viajes: solo a quienes siguen en el grupo
create or replace function public.registrar_viajes(p_grupo uuid, p_pasajeros uuid[], p_fecha date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fecha  date := coalesce(p_fecha, public.hoy());
  v_precio integer;
  v_id     uuid;
  v_nuevos integer := 0;
begin
  if not public.es_chofer(p_grupo) then
    raise exception 'Solo el chofer puede registrar viajes';
  end if;
  if v_fecha > public.hoy() then
    raise exception 'No se pueden registrar viajes a futuro';
  end if;

  select precio_viaje into v_precio from public.grupos where id = p_grupo;

  foreach v_id in array coalesce(p_pasajeros, '{}') loop
    if not exists (
      select 1 from public.miembros
      where grupo_id = p_grupo and perfil_id = v_id and salio_at is null
    ) then
      raise exception 'Una de las personas no es parte del grupo';
    end if;

    -- Si había un aviso pendiente, se confirma
    update public.viajes
    set estado = 'confirmado', resuelto_at = now()
    where grupo_id = p_grupo and pasajero_id = v_id and fecha = v_fecha and estado = 'pendiente';

    if found then
      v_nuevos := v_nuevos + 1;
    elsif not exists (
      select 1 from public.viajes
      where grupo_id = p_grupo and pasajero_id = v_id and fecha = v_fecha and estado = 'confirmado'
    ) then
      insert into public.viajes (grupo_id, pasajero_id, fecha, monto, estado, creado_por, resuelto_at)
      values (p_grupo, v_id, v_fecha, v_precio, 'confirmado', (select auth.uid()), now());
      v_nuevos := v_nuevos + 1;
    end if;
  end loop;

  return v_nuevos;
end;
$$;

-- Salir del grupo (el pasajero) o quitar a alguien (el chofer).
-- registrar_pago sigue aceptando a quien se fue, para poder cobrarle.
create function public.quitar_del_grupo(p_grupo uuid, p_perfil uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_perfil <> (select auth.uid()) and not public.es_chofer(p_grupo) then
    raise exception 'Solo el que maneja puede quitar personas del grupo';
  end if;

  update public.miembros
  set salio_at = now()
  where grupo_id = p_grupo and perfil_id = p_perfil and salio_at is null;

  if not found then
    raise exception 'Esa persona ya no está en el grupo';
  end if;
end;
$$;

revoke execute on function public.quitar_del_grupo(uuid, uuid) from public, anon;
grant execute on function public.quitar_del_grupo(uuid, uuid) to authenticated;
