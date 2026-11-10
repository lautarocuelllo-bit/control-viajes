import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilaMovimiento } from '@/components/Movimientos';
import { Boton, Cargando, Casilla, MensajeError, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { desdeISO, fechaCorta, fechaISO, plata, sumarDias } from '@/lib/formato';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, radio } from '@/lib/tema';
import { mezclarMovimientos } from '@/lib/tipos';
import { useDatosGrupo } from '@/lib/useDatosGrupo';

const DIAS_ATRAS = 30;

export default function PanelChofer() {
  const { grupo, perfil, recargar: recargarSesion } = useSesion();
  const datos = useDatosGrupo(grupo?.id, recargarSesion);

  const hoyISO = fechaISO(new Date());
  const [fecha, setFecha] = useState(hoyISO);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [registrando, setRegistrando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  const nombres = useMemo(
    () => Object.fromEntries(datos.pasajeros.map((p) => [p.id, p.nombre])),
    [datos.pasajeros]
  );

  // Viajes de la fecha elegida, por pasajero
  const yaRegistrados = useMemo(
    () => new Set(datos.viajes.filter((v) => v.fecha === fecha && v.estado === 'confirmado').map((v) => v.pasajero_id)),
    [datos.viajes, fecha]
  );
  const avisaron = useMemo(
    () => new Set(datos.viajes.filter((v) => v.fecha === fecha && v.estado === 'pendiente').map((v) => v.pasajero_id)),
    [datos.viajes, fecha]
  );

  // Al cambiar de día se tildan solos los que avisaron que fueron
  const claveAvisos = [...avisaron].sort().join(',');
  useEffect(() => {
    setSeleccion(new Set(avisaron));
    setMensaje(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, claveAvisos]);

  const pendientes = useMemo(
    () =>
      mezclarMovimientos(
        datos.viajes.filter((v) => v.estado === 'pendiente'),
        datos.pagos.filter((p) => p.estado === 'pendiente')
      ),
    [datos.viajes, datos.pagos]
  );

  const saldoDe = (id: string) => datos.saldos.find((s) => s.pasajero_id === id);
  const totalAdeudado = datos.saldos.reduce((suma, s) => suma + Math.max(0, s.saldo), 0);

  if (!grupo) return null;
  if (datos.cargando) return <Cargando />;

  function alternar(id: string) {
    setSeleccion((anterior) => {
      const nueva = new Set(anterior);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });
  }

  async function registrar() {
    if (!grupo) return;
    const ids = [...seleccion].filter((id) => !yaRegistrados.has(id));
    if (ids.length === 0) return setError('Tildá al menos a una persona.');
    setRegistrando(true);
    setError(null);
    const { data, error } = await supabase.rpc('registrar_viajes', {
      p_grupo: grupo.id,
      p_pasajeros: ids,
      p_fecha: fecha,
    });
    setRegistrando(false);
    if (error) return setError(mensajeDeError(error));
    setSeleccion(new Set());
    setMensaje(`Listo: ${data} ${data === 1 ? 'viaje registrado' : 'viajes registrados'} (${fechaCorta(fecha).toLowerCase()}).`);
    datos.recargar();
  }

  async function resolver(tipo: 'viaje' | 'pago', id: string, aprobar: boolean) {
    setResolviendo(id);
    setError(null);
    const { error } = await supabase.rpc('resolver_movimiento', { p_tipo: tipo, p_id: id, p_aprobar: aprobar });
    setResolviendo(null);
    if (error) return setError(mensajeDeError(error));
    datos.recargar();
  }

  const fechaDate = desdeISO(fecha);
  const esHoy = fecha === hoyISO;
  const esElMasViejo = fecha <= fechaISO(sumarDias(new Date(), -DIAS_ATRAS));
  const nuevos = [...seleccion].filter((id) => !yaRegistrados.has(id)).length;
  const todosRegistrados = datos.pasajeros.length > 0 && datos.pasajeros.every((p) => yaRegistrados.has(p.id));

  return (
    <Pantalla recargando={datos.recargando} alRecargar={datos.recargar}>
      {/* Encabezado */}
      <View style={estilos.encabezado}>
        <View style={{ flex: 1 }}>
          <Texto variante="suave">Hola, {perfil?.nombre}</Texto>
          <Texto variante="titulo">{grupo.nombre}</Texto>
        </View>
        <Boton titulo="Ajustes" tipo="secundario" chico alTocar={() => router.push('/chofer/ajustes')} />
      </View>

      <MensajeError mensaje={datos.error} />

      {datos.pasajeros.length === 0 ? (
        <Tarjeta>
          <Texto variante="subtitulo">Sumá a tus pasajeros</Texto>
          <Texto variante="suave">Pasales este código para que se unan desde la app:</Texto>
          <Text style={estilos.codigo} selectable>
            {grupo.codigo}
          </Text>
        </Tarjeta>
      ) : (
        <>
          {/* Registrar el viaje del día */}
          <Tarjeta>
            <View style={estilos.selectorFecha}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Día anterior"
                disabled={esElMasViejo}
                onPress={() => setFecha(fechaISO(sumarDias(fechaDate, -1)))}
                style={[estilos.flecha, esElMasViejo && { opacity: 0.3 }]}
              >
                <Text style={estilos.flechaTexto}>‹</Text>
              </Pressable>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Texto variante="etiqueta">¿Quién fue?</Texto>
                <Texto variante="subtitulo">{fechaCorta(fecha)}</Texto>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Día siguiente"
                disabled={esHoy}
                onPress={() => setFecha(fechaISO(sumarDias(fechaDate, 1)))}
                style={[estilos.flecha, esHoy && { opacity: 0.3 }]}
              >
                <Text style={estilos.flechaTexto}>›</Text>
              </Pressable>
            </View>

            {datos.pasajeros.map((p) => {
              const registrado = yaRegistrados.has(p.id);
              return (
                <Casilla
                  key={p.id}
                  etiqueta={p.nombre}
                  detalle={registrado ? 'Ya registrado' : avisaron.has(p.id) ? 'Avisó que fue' : undefined}
                  marcada={registrado || seleccion.has(p.id)}
                  deshabilitada={registrado}
                  alTocar={() => alternar(p.id)}
                />
              );
            })}

            {mensaje ? <Text style={{ color: colores.acento }}>{mensaje}</Text> : null}
            <MensajeError mensaje={error} />
            {todosRegistrados ? (
              <Text style={estilos.todosListos}>✓ Todos registrados {esHoy ? 'hoy' : 'ese día'}</Text>
            ) : (
              <Boton
                titulo={
                  nuevos > 0
                    ? `Registrar ${nuevos} ${nuevos === 1 ? 'viaje' : 'viajes'} · ${plata(grupo.precio_viaje)} c/u`
                    : 'Tildá quién fue'
                }
                alTocar={registrar}
                cargando={registrando}
                deshabilitado={nuevos === 0}
              />
            )}
          </Tarjeta>

          {/* Avisos para confirmar */}
          {pendientes.length > 0 ? (
            <Seccion titulo={`Para confirmar (${pendientes.length})`}>
              {pendientes.map((m) => (
                <Tarjeta key={`${m.tipo}-${m.id}`} style={{ gap: espacio.s, borderColor: colores.pendiente }}>
                  <FilaMovimiento movimiento={m} nombre={nombres[m.pasajero_id]} />
                  <View style={{ flexDirection: 'row', gap: espacio.s }}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Rechazar"
                        tipo="secundario"
                        chico
                        deshabilitado={resolviendo === m.id}
                        alTocar={() => resolver(m.tipo, m.id, false)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Boton
                        titulo="Confirmar"
                        chico
                        cargando={resolviendo === m.id}
                        alTocar={() => resolver(m.tipo, m.id, true)}
                      />
                    </View>
                  </View>
                </Tarjeta>
              ))}
            </Seccion>
          ) : null}

          {/* Cuánto debe cada uno */}
          <Seccion
            titulo="Saldos"
            extra={<Texto variante="suave">Te deben {plata(totalAdeudado)}</Texto>}
          >
            <View style={estilos.lista}>
              {datos.pasajeros.map((p, i) => {
                const saldo = saldoDe(p.id);
                const debe = (saldo?.saldo ?? 0) > 0;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityHint="Ver el detalle y registrar pagos"
                    onPress={() => router.push({ pathname: '/chofer/[pasajeroId]', params: { pasajeroId: p.id } })}
                    style={({ pressed }) => [estilos.filaSaldo, i > 0 && estilos.separador, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Texto style={{ fontWeight: '600' }}>{p.nombre}</Texto>
                      <Texto variante="suave">
                        {saldo?.cantidad_viajes ?? 0} {saldo?.cantidad_viajes === 1 ? 'viaje' : 'viajes'}
                      </Texto>
                    </View>
                    <Text style={[estilos.saldo, { color: debe ? colores.deuda : colores.acento }]}>
                      {debe ? plata(saldo!.saldo) : (saldo?.saldo ?? 0) < 0 ? `A favor ${plata(-saldo!.saldo)}` : 'Al día'}
                    </Text>
                    <Text style={{ color: colores.textoSuave, fontSize: 20 }}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </Seccion>
        </>
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.m, marginTop: espacio.s },
  codigo: {
    color: colores.texto,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: espacio.m,
    fontVariant: ['tabular-nums'],
  },
  selectorFecha: { flexDirection: 'row', alignItems: 'center' },
  flecha: {
    width: 44,
    height: 44,
    borderRadius: radio.pill,
    backgroundColor: colores.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaTexto: { color: colores.texto, fontSize: 26, lineHeight: 28, fontWeight: '600' },
  lista: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.l,
    paddingHorizontal: espacio.l,
  },
  separador: { borderTopWidth: 1, borderTopColor: colores.borde },
  filaSaldo: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: espacio.m, minHeight: 56 },
  saldo: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  todosListos: { color: colores.acento, fontWeight: '700', textAlign: 'center', paddingVertical: espacio.s },
});
