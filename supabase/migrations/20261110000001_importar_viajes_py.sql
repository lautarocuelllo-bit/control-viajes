-- =====================================================================
-- Importar los datos de la app vieja (viajes.py)
--
-- viajes.py guardaba dos archivos:
--   historial.json  [{ persona, accion: "viaje" | "pago", monto, fecha }]
--   deudas.json     { persona: monto }
-- El historial se carga como viajes y pagos confirmados, con su fecha
-- original. Si solo está deudas.json, cada saldo entra como "deuda anterior".
-- =====================================================================

-- ---------------------------------------------------------------------
-- Deuda anterior: positiva si la persona debía, negativa si tenía a favor
-- ---------------------------------------------------------------------

create table public.deudas_anteriores (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  pasajero_id uuid not null references public.perfiles (id) on delete cascade,
  monto       integer not null check (monto <> 0),
  nota        text check (char_length(nota) <= 120),
  estado      public.estado_movimiento not null,
  creado_por  uuid not null references public.perfiles (id),
  created_at  timestamptz not null default now(),
  resuelto_at timestamptz
);

create index deudas_anteriores_grupo_idx    on public.deudas_anteriores (grupo_id);
create index deudas_anteriores_pasajero_idx on public.deudas_anteriores (pasajero_id);

alter table public.deudas_anteriores enable row level security;

create policy "ver deudas anteriores" on public.deudas_anteriores
  for select to authenticated
  using (pasajero_id = (select auth.uid()) or public.es_chofer(grupo_id));

revoke all on public.deudas_anteriores from anon;
revoke insert, update, delete on public.deudas_anteriores from authenticated;
grant select on public.deudas_anteriores to authenticated;

-- Cuándo se importó por última vez (la app avisa antes de importar dos veces)
alter table public.grupos add column importado_at timestamptz;

-- ---------------------------------------------------------------------
-- Saldos: ahora también suma la deuda anterior (columna nueva al final)
-- ---------------------------------------------------------------------

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
  coalesce(d.total, 0)                                         as deuda_anterior
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

-- ---------------------------------------------------------------------
-- Importar. p_datos:
--   { viajes: [{ pasajero, momento, monto }],
--     pagos:  [{ pasajero, momento, monto }],
--     deudas: [{ pasajero, monto }] }
-- "momento" es la fecha de viajes.py ("2025-06-12 16:01:56", hora de Mendoza).
-- Devuelve cuántos viajes, pagos y deudas cargó, y cuántos viajes saltó por
-- estar repetidos el mismo día.
-- ---------------------------------------------------------------------

create function public.importar_viajes_py(p_grupo uuid, p_datos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_viajes    jsonb := coalesce(p_datos -> 'viajes', '[]'::jsonb);
  v_pagos     jsonb := coalesce(p_datos -> 'pagos', '[]'::jsonb);
  v_deudas    jsonb := coalesce(p_datos -> 'deudas', '[]'::jsonb);
  v_item      jsonb;
  v_momento   timestamptz;
  v_monto     integer;
  v_filas     integer;
  n_viajes    integer := 0;
  n_pagos     integer := 0;
  n_deudas    integer := 0;
  n_repetidos integer := 0;
begin
  if not public.es_chofer(p_grupo) then
    raise exception 'Solo el que maneja puede importar datos';
  end if;

  if jsonb_typeof(v_viajes) <> 'array' or jsonb_typeof(v_pagos) <> 'array' or jsonb_typeof(v_deudas) <> 'array' then
    raise exception 'Los datos para importar no tienen el formato esperado';
  end if;

  if jsonb_array_length(v_viajes) + jsonb_array_length(v_pagos) + jsonb_array_length(v_deudas) = 0 then
    raise exception 'No hay nada para importar';
  end if;

  if jsonb_array_length(v_viajes) + jsonb_array_length(v_pagos) + jsonb_array_length(v_deudas) > 5000 then
    raise exception 'Son demasiados movimientos para importar de una vez';
  end if;

  -- Todas las personas tienen que ser pasajeras de este grupo
  if exists (
    select 1
    from (
      select e ->> 'pasajero' as pasajero from jsonb_array_elements(v_viajes) e
      union select e ->> 'pasajero' from jsonb_array_elements(v_pagos) e
      union select e ->> 'pasajero' from jsonb_array_elements(v_deudas) e
    ) x
    where not exists (
      select 1 from public.miembros m
      where m.grupo_id = p_grupo and m.perfil_id::text = x.pasajero
    )
  ) then
    raise exception 'Hay personas que no son pasajeras de este grupo';
  end if;

  for v_item in select * from jsonb_array_elements(v_viajes) loop
    v_momento := (v_item ->> 'momento')::timestamp at time zone 'America/Argentina/Mendoza';
    v_monto := (v_item ->> 'monto')::integer;
    if v_monto <= 0 then
      raise exception 'Un viaje tiene un monto inválido';
    end if;
    if (v_momento at time zone 'America/Argentina/Mendoza')::date > public.hoy() then
      raise exception 'Hay viajes con fecha en el futuro';
    end if;

    insert into public.viajes (grupo_id, pasajero_id, fecha, monto, estado, creado_por, created_at, resuelto_at)
    values (
      p_grupo,
      (v_item ->> 'pasajero')::uuid,
      (v_momento at time zone 'America/Argentina/Mendoza')::date,
      v_monto,
      'confirmado',
      v_uid,
      v_momento,
      v_momento
    )
    on conflict (grupo_id, pasajero_id, fecha) where estado in ('pendiente', 'confirmado') do nothing;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
      n_repetidos := n_repetidos + 1;
    else
      n_viajes := n_viajes + 1;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(v_pagos) loop
    v_momento := (v_item ->> 'momento')::timestamp at time zone 'America/Argentina/Mendoza';
    v_monto := (v_item ->> 'monto')::integer;
    if v_monto <= 0 then
      raise exception 'Un pago tiene un monto inválido';
    end if;

    insert into public.pagos (grupo_id, pasajero_id, monto, nota, estado, creado_por, created_at, resuelto_at)
    values (p_grupo, (v_item ->> 'pasajero')::uuid, v_monto, 'Importado de viajes.py', 'confirmado', v_uid, v_momento, v_momento);
    n_pagos := n_pagos + 1;
  end loop;

  for v_item in select * from jsonb_array_elements(v_deudas) loop
    v_monto := (v_item ->> 'monto')::integer;
    if v_monto = 0 then
      continue;
    end if;

    insert into public.deudas_anteriores (grupo_id, pasajero_id, monto, nota, estado, creado_por)
    values (p_grupo, (v_item ->> 'pasajero')::uuid, v_monto, 'Saldo de viajes.py', 'confirmado', v_uid);
    n_deudas := n_deudas + 1;
  end loop;

  update public.grupos set importado_at = now() where id = p_grupo;

  return jsonb_build_object('viajes', n_viajes, 'pagos', n_pagos, 'deudas', n_deudas, 'repetidos', n_repetidos);
end;
$$;

-- ---------------------------------------------------------------------
-- Anular: ahora también deudas anteriores
-- ---------------------------------------------------------------------

create or replace function public.anular_movimiento(p_tipo text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  if p_tipo = 'viaje' then
    select grupo_id into v_grupo from public.viajes where id = p_id and estado = 'confirmado';
  elsif p_tipo = 'pago' then
    select grupo_id into v_grupo from public.pagos where id = p_id and estado = 'confirmado';
  elsif p_tipo = 'deuda' then
    select grupo_id into v_grupo from public.deudas_anteriores where id = p_id and estado = 'confirmado';
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  if v_grupo is null or not public.es_chofer(v_grupo) then
    raise exception 'Solo el chofer puede anular movimientos confirmados';
  end if;

  if p_tipo = 'viaje' then
    update public.viajes set estado = 'anulado', resuelto_at = now() where id = p_id;
  elsif p_tipo = 'pago' then
    update public.pagos set estado = 'anulado', resuelto_at = now() where id = p_id;
  else
    update public.deudas_anteriores set estado = 'anulado', resuelto_at = now() where id = p_id;
  end if;
end;
$$;

revoke execute on function public.importar_viajes_py(uuid, jsonb) from public, anon;
grant execute on function public.importar_viajes_py(uuid, jsonb) to authenticated;

alter publication supabase_realtime add table public.deudas_anteriores;
