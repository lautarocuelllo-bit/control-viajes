-- =====================================================================
-- Control de viajes: esquema, reglas de acceso (RLS) y funciones
--
-- Idea general:
--   * Las tablas solo se pueden LEER desde la app, y cada uno ve lo suyo.
--   * Todo lo que escribe pasa por funciones (RPC) que validan quién la
--     llama y qué puede hacer. Así el precio de un viaje, por ejemplo,
--     siempre sale del grupo y no de lo que mande la app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null check (char_length(trim(nombre)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.grupos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (char_length(trim(nombre)) between 1 and 60),
  chofer_id    uuid not null references public.perfiles (id) on delete cascade,
  precio_viaje integer not null check (precio_viaje > 0),
  codigo       text not null unique check (codigo ~ '^[0-9]{6}$'),
  created_at   timestamptz not null default now()
);

create table public.miembros (
  grupo_id  uuid not null references public.grupos (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  unido_at  timestamptz not null default now(),
  primary key (grupo_id, perfil_id)
);

create type public.estado_movimiento as enum ('pendiente', 'confirmado', 'rechazado', 'anulado');

create table public.viajes (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  pasajero_id uuid not null references public.perfiles (id) on delete cascade,
  fecha       date not null,
  monto       integer not null check (monto > 0),       -- precio del viaje en ese momento
  estado      public.estado_movimiento not null,
  creado_por  uuid not null references public.perfiles (id),
  created_at  timestamptz not null default now(),
  resuelto_at timestamptz
);

-- Una persona no puede tener dos viajes activos el mismo día en el mismo grupo
create unique index viajes_un_viaje_por_dia
  on public.viajes (grupo_id, pasajero_id, fecha)
  where estado in ('pendiente', 'confirmado');

create table public.pagos (
  id          uuid primary key default gen_random_uuid(),
  grupo_id    uuid not null references public.grupos (id) on delete cascade,
  pasajero_id uuid not null references public.perfiles (id) on delete cascade,
  monto       integer not null check (monto > 0),
  nota        text check (char_length(nota) <= 120),
  estado      public.estado_movimiento not null,
  creado_por  uuid not null references public.perfiles (id),
  created_at  timestamptz not null default now(),
  resuelto_at timestamptz
);

create index viajes_grupo_idx   on public.viajes (grupo_id, fecha desc);
create index viajes_pasajero_idx on public.viajes (pasajero_id);
create index pagos_grupo_idx    on public.pagos (grupo_id, created_at desc);
create index pagos_pasajero_idx on public.pagos (pasajero_id);
create index miembros_perfil_idx on public.miembros (perfil_id);
create index grupos_chofer_idx  on public.grupos (chofer_id);

-- ---------------------------------------------------------------------
-- Perfil automático al registrarse (toma el nombre del registro)
-- ---------------------------------------------------------------------

create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ---------------------------------------------------------------------
-- Funciones auxiliares para las reglas (evitan recursión en RLS)
-- ---------------------------------------------------------------------

create function public.es_chofer(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grupos g
    where g.id = p_grupo and g.chofer_id = (select auth.uid())
  );
$$;

create function public.es_miembro(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.grupo_id = p_grupo and m.perfil_id = (select auth.uid())
  );
$$;

-- ¿Comparto algún grupo con esta persona? (para ver su nombre)
create function public.comparto_grupo(p_perfil uuid)
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
      -- soy chofer y la persona es pasajera de mi grupo
      (g.chofer_id = (select auth.uid()) and m.perfil_id = p_perfil)
      -- soy pasajero y la persona es el chofer o pasajera de mi grupo
      or (m.perfil_id = (select auth.uid()) and (g.chofer_id = p_perfil or exists (
            select 1 from public.miembros m2
            where m2.grupo_id = g.id and m2.perfil_id = p_perfil)))
  );
$$;

-- Fecha de hoy en Mendoza (no en UTC)
create function public.hoy()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Argentina/Mendoza')::date;
$$;

-- ---------------------------------------------------------------------
-- Reglas de lectura (RLS). No hay reglas de escritura: se escribe por RPC.
-- ---------------------------------------------------------------------

alter table public.perfiles enable row level security;
alter table public.grupos   enable row level security;
alter table public.miembros enable row level security;
alter table public.viajes   enable row level security;
alter table public.pagos    enable row level security;

create policy "ver mi perfil y el de mi grupo" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or public.comparto_grupo(id));

create policy "cambiar mi nombre" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "ver mis grupos" on public.grupos
  for select to authenticated
  using (chofer_id = (select auth.uid()) or public.es_miembro(id));

create policy "ver integrantes" on public.miembros
  for select to authenticated
  using (perfil_id = (select auth.uid()) or public.es_chofer(grupo_id));

create policy "ver viajes" on public.viajes
  for select to authenticated
  using (pasajero_id = (select auth.uid()) or public.es_chofer(grupo_id));

create policy "ver pagos" on public.pagos
  for select to authenticated
  using (pasajero_id = (select auth.uid()) or public.es_chofer(grupo_id));

-- Solo se puede cambiar la columna nombre del perfil
revoke all on public.perfiles, public.grupos, public.miembros, public.viajes, public.pagos from anon;
revoke insert, update, delete on public.perfiles, public.grupos, public.miembros, public.viajes, public.pagos from authenticated;
grant select on public.perfiles, public.grupos, public.miembros, public.viajes, public.pagos to authenticated;
grant update (nombre) on public.perfiles to authenticated;

-- ---------------------------------------------------------------------
-- Saldos: viajes confirmados menos pagos confirmados.
-- security_invoker hace que se apliquen las reglas de quien consulta:
-- el pasajero ve solo su fila y el chofer ve las de todo su grupo.
-- ---------------------------------------------------------------------

create view public.saldos
with (security_invoker = true)
as
select
  m.grupo_id,
  m.perfil_id as pasajero_id,
  coalesce(v.total, 0)                     as total_viajes,
  coalesce(v.cantidad, 0)                  as cantidad_viajes,
  coalesce(p.total, 0)                     as total_pagos,
  coalesce(v.total, 0) - coalesce(p.total, 0) as saldo
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
) p on p.grupo_id = m.grupo_id and p.pasajero_id = m.perfil_id;

revoke all on public.saldos from anon;
grant select on public.saldos to authenticated;

-- ---------------------------------------------------------------------
-- Funciones que usa la app (todas validan quién las llama)
-- ---------------------------------------------------------------------

-- Crear un grupo: quien lo crea es el chofer
create function public.crear_grupo(p_nombre text, p_precio integer)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_codigo text;
  v_grupo  public.grupos;
begin
  if (select auth.uid()) is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  if p_precio is null or p_precio <= 0 then
    raise exception 'El precio tiene que ser mayor a 0';
  end if;

  loop
    v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.grupos where codigo = v_codigo);
  end loop;

  insert into public.grupos (nombre, chofer_id, precio_viaje, codigo)
  values (trim(p_nombre), (select auth.uid()), p_precio, v_codigo)
  returning * into v_grupo;

  return v_grupo;
end;
$$;

-- Unirse a un grupo con el código de 6 dígitos
create function public.unirse_a_grupo(p_codigo text)
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
  on conflict do nothing;

  return v_grupo.id;
end;
$$;

-- Chofer: cambiar el precio (los viajes ya registrados no cambian)
create function public.cambiar_precio(p_grupo uuid, p_precio integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_chofer(p_grupo) then
    raise exception 'Solo el chofer puede cambiar el precio';
  end if;
  if p_precio is null or p_precio <= 0 then
    raise exception 'El precio tiene que ser mayor a 0';
  end if;
  update public.grupos set precio_viaje = p_precio where id = p_grupo;
end;
$$;

-- Chofer: registrar quién viajó un día. Confirma también los avisos
-- pendientes de ese día. Devuelve cuántos viajes quedaron registrados.
create function public.registrar_viajes(p_grupo uuid, p_pasajeros uuid[], p_fecha date default null)
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
    if not exists (select 1 from public.miembros where grupo_id = p_grupo and perfil_id = v_id) then
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

-- Pasajero: avisar "hoy fui" (queda pendiente hasta que el chofer confirme)
create function public.avisar_viaje(p_grupo uuid, p_fecha date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fecha date := coalesce(p_fecha, public.hoy());
  v_id    uuid;
begin
  if not public.es_miembro(p_grupo) then
    raise exception 'No sos parte de este grupo';
  end if;
  if v_fecha > public.hoy() then
    raise exception 'No se pueden avisar viajes a futuro';
  end if;
  if v_fecha < public.hoy() - 30 then
    raise exception 'Solo se pueden avisar viajes de los últimos 30 días';
  end if;
  if exists (
    select 1 from public.viajes
    where grupo_id = p_grupo and pasajero_id = (select auth.uid())
      and fecha = v_fecha and estado in ('pendiente', 'confirmado')
  ) then
    raise exception 'Ese viaje ya está registrado';
  end if;

  insert into public.viajes (grupo_id, pasajero_id, fecha, monto, estado, creado_por)
  select p_grupo, (select auth.uid()), v_fecha, g.precio_viaje, 'pendiente', (select auth.uid())
  from public.grupos g where g.id = p_grupo
  returning id into v_id;

  return v_id;
end;
$$;

-- Pasajero: avisar un pago (queda pendiente hasta que el chofer confirme)
create function public.avisar_pago(p_grupo uuid, p_monto integer, p_nota text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.es_miembro(p_grupo) then
    raise exception 'No sos parte de este grupo';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor a 0';
  end if;

  insert into public.pagos (grupo_id, pasajero_id, monto, nota, estado, creado_por)
  values (p_grupo, (select auth.uid()), p_monto, nullif(trim(p_nota), ''), 'pendiente', (select auth.uid()))
  returning id into v_id;

  return v_id;
end;
$$;

-- Chofer: registrar un pago que recibió (queda confirmado directo)
create function public.registrar_pago(p_grupo uuid, p_pasajero uuid, p_monto integer, p_nota text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.es_chofer(p_grupo) then
    raise exception 'Solo el chofer puede registrar pagos';
  end if;
  if not exists (select 1 from public.miembros where grupo_id = p_grupo and perfil_id = p_pasajero) then
    raise exception 'Esa persona no es parte del grupo';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor a 0';
  end if;

  insert into public.pagos (grupo_id, pasajero_id, monto, nota, estado, creado_por, resuelto_at)
  values (p_grupo, p_pasajero, p_monto, nullif(trim(p_nota), ''), 'confirmado', (select auth.uid()), now())
  returning id into v_id;

  return v_id;
end;
$$;

-- Chofer: confirmar o rechazar un aviso pendiente (viaje o pago)
create function public.resolver_movimiento(p_tipo text, p_id uuid, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid;
  v_nuevo public.estado_movimiento :=
    (case when p_aprobar then 'confirmado' else 'rechazado' end)::public.estado_movimiento;
begin
  if p_tipo = 'viaje' then
    select grupo_id into v_grupo from public.viajes where id = p_id and estado = 'pendiente';
  elsif p_tipo = 'pago' then
    select grupo_id into v_grupo from public.pagos where id = p_id and estado = 'pendiente';
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  if v_grupo is null then
    raise exception 'Ese aviso ya no está pendiente';
  end if;
  if not public.es_chofer(v_grupo) then
    raise exception 'Solo el chofer puede confirmar';
  end if;

  if p_tipo = 'viaje' then
    update public.viajes set estado = v_nuevo, resuelto_at = now() where id = p_id;
  else
    update public.pagos set estado = v_nuevo, resuelto_at = now() where id = p_id;
  end if;
end;
$$;

-- Chofer: anular un viaje o pago confirmado que se cargó por error
create function public.anular_movimiento(p_tipo text, p_id uuid)
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
  else
    raise exception 'Tipo de movimiento inválido';
  end if;

  if v_grupo is null or not public.es_chofer(v_grupo) then
    raise exception 'Solo el chofer puede anular movimientos confirmados';
  end if;

  if p_tipo = 'viaje' then
    update public.viajes set estado = 'anulado', resuelto_at = now() where id = p_id;
  else
    update public.pagos set estado = 'anulado', resuelto_at = now() where id = p_id;
  end if;
end;
$$;

-- Permisos de las funciones: solo usuarios con sesión iniciada
revoke execute on function
  public.crear_perfil(),
  public.es_chofer(uuid),
  public.es_miembro(uuid),
  public.comparto_grupo(uuid),
  public.crear_grupo(text, integer),
  public.unirse_a_grupo(text),
  public.cambiar_precio(uuid, integer),
  public.registrar_viajes(uuid, uuid[], date),
  public.avisar_viaje(uuid, date),
  public.avisar_pago(uuid, integer, text),
  public.registrar_pago(uuid, uuid, integer, text),
  public.resolver_movimiento(text, uuid, boolean),
  public.anular_movimiento(text, uuid)
from public, anon;

grant execute on function
  public.es_chofer(uuid),
  public.es_miembro(uuid),
  public.comparto_grupo(uuid),
  public.hoy(),
  public.crear_grupo(text, integer),
  public.unirse_a_grupo(text),
  public.cambiar_precio(uuid, integer),
  public.registrar_viajes(uuid, uuid[], date),
  public.avisar_viaje(uuid, date),
  public.avisar_pago(uuid, integer, text),
  public.registrar_pago(uuid, uuid, integer, text),
  public.resolver_movimiento(text, uuid, boolean),
  public.anular_movimiento(text, uuid)
to authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real: la app se entera al instante de viajes, pagos y miembros
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.viajes, public.pagos, public.miembros, public.grupos;
