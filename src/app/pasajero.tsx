import { Car, Clock, HandCoins, SignOut } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListaMovimientos } from '@/components/Movimientos';
import { Aviso, Boton, Campo, Cargando, MensajeError, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { fechaISO, plata } from '@/lib/formato';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, fuentes } from '@/lib/tema';
import { mezclarMovimientos } from '@/lib/tipos';
import { useDatosGrupo } from '@/lib/useDatosGrupo';

export default function PanelPasajero() {
  const { grupo, perfil, recargar: recargarSesion, salir } = useSesion();
  const datos = useDatosGrupo(grupo?.id, recargarSesion);

  const [chofer, setChofer] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nombre de quien maneja
  useEffect(() => {
    if (!grupo) return;
    supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', grupo.chofer_id)
      .maybeSingle()
      .then(({ data }) => setChofer(data?.nombre ?? null));
  }, [grupo]);

  const movimientos = useMemo(() => mezclarMovimientos(datos.viajes, datos.pagos), [datos.viajes, datos.pagos]);

  if (!grupo) return null;
  if (datos.cargando) return <Cargando />;

  const saldo = datos.saldos[0];
  const debe = saldo?.saldo ?? 0;
  const hoy = fechaISO(new Date());
  const viajeDeHoy = datos.viajes.find((v) => v.fecha === hoy && (v.estado === 'pendiente' || v.estado === 'confirmado'));
  const pagosPendientes = datos.pagos.filter((p) => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);

  async function avisarViaje() {
    if (!grupo) return;
    setAvisando(true);
    setError(null);
    const { error } = await supabase.rpc('avisar_viaje', { p_grupo: grupo.id });
    setAvisando(false);
    if (error) return setError(mensajeDeError(error));
    setMensaje(`Listo, le avisamos a ${chofer ?? 'quien maneja'}. Se suma cuando lo confirme.`);
    datos.recargar();
  }

  async function avisarPago() {
    if (!grupo) return;
    const valor = Number(monto.replace(/\D/g, ''));
    if (!valor) return setError('Poné cuánto le pagaste.');
    setEnviandoPago(true);
    setError(null);
    const { error } = await supabase.rpc('avisar_pago', {
      p_grupo: grupo.id,
      p_monto: valor,
      p_nota: nota.trim() || null,
    });
    setEnviandoPago(false);
    if (error) return setError(mensajeDeError(error));
    setMonto('');
    setNota('');
    setMostrarPago(false);
    setMensaje(`Avisaste un pago de ${plata(valor)}. Se descuenta cuando ${chofer ?? 'quien maneja'} lo confirme.`);
    datos.recargar();
  }

  return (
    <Pantalla recargando={datos.recargando} alRecargar={datos.recargar}>
      <View style={{ gap: espacio.xs, marginTop: espacio.s }}>
        <Texto variante="suave">Hola, {perfil?.nombre}</Texto>
        <Texto variante="titulo">{grupo.nombre}</Texto>
        {chofer ? <Texto variante="suave">Te lleva {chofer} · {plata(grupo.precio_viaje)} por viaje</Texto> : null}
      </View>

      <MensajeError mensaje={datos.error} />

      {/* Saldo */}
      <Tarjeta style={{ alignItems: 'center', paddingVertical: espacio.xl }}>
        <Texto variante="etiqueta">{debe > 0 ? 'Le debés' : debe < 0 ? 'Tenés a favor' : 'Estás'}</Texto>
        <Text style={[estilos.saldo, { color: debe > 0 ? colores.acento : colores.texto }]}>
          {debe === 0 ? 'Al día' : plata(Math.abs(debe))}
        </Text>
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          {saldo?.cantidad_viajes ?? 0} {saldo?.cantidad_viajes === 1 ? 'viaje' : 'viajes'}, pagaste {plata(saldo?.total_pagos ?? 0)}
        </Texto>
        {pagosPendientes > 0 ? (
          <View style={estilos.pendiente}>
            <Clock size={16} color={colores.acento} />
            <Text style={estilos.pendienteTexto}>{plata(pagosPendientes)} esperando confirmación</Text>
          </View>
        ) : null}
      </Tarjeta>

      {/* Acciones */}
      <View style={{ gap: espacio.s }}>
        {mensaje ? <Aviso texto={mensaje} /> : null}
        <MensajeError mensaje={error} />
        {viajeDeHoy ? (
          viajeDeHoy.estado === 'confirmado' ? (
            <Aviso texto="El viaje de hoy ya está registrado" />
          ) : mensaje ? null : (
            <Aviso icono={Clock} tono="suave" texto={`Avisaste el viaje de hoy. Falta que ${chofer ?? 'quien maneja'} lo confirme.`} />
          )
        ) : (
          <Boton titulo="Hoy fui" icono={Car} alTocar={avisarViaje} cargando={avisando} />
        )}
        {!mostrarPago ? (
          <Boton titulo="Avisar que pagué" icono={HandCoins} tipo="secundario" alTocar={() => setMostrarPago(true)} />
        ) : (
          <Tarjeta>
            <Texto variante="subtitulo">¿Cuánto le pagaste?</Texto>
            <Campo
              etiqueta="Monto"
              value={monto}
              onChangeText={(t) => setMonto(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder="Ej: 5000"
              autoFocus
            />
            {debe > 0 ? (
              <Boton titulo={`Todo lo que debo (${plata(debe)})`} tipo="texto" chico alTocar={() => setMonto(String(debe))} />
            ) : null}
            <Campo etiqueta="Nota (opcional)" value={nota} onChangeText={setNota} placeholder="Transferencia, efectivo…" maxLength={120} />
            <View style={{ flexDirection: 'row', gap: espacio.s }}>
              <View style={{ flex: 1 }}>
                <Boton titulo="Cancelar" tipo="secundario" alTocar={() => setMostrarPago(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton titulo="Avisar pago" alTocar={avisarPago} cargando={enviandoPago} />
              </View>
            </View>
          </Tarjeta>
        )}
      </View>

      <Seccion titulo="Historial">
        <ListaMovimientos movimientos={movimientos} vacio="Cuando registres viajes o pagos, aparecen acá." />
      </Seccion>

      <Boton titulo="Cerrar sesión" icono={SignOut} tipo="texto" alTocar={salir} />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  saldo: { fontSize: 52, fontFamily: fuentes.extra, fontVariant: ['tabular-nums'], marginVertical: espacio.xs },
  pendiente: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: espacio.xs },
  pendienteTexto: { color: colores.acento, fontFamily: fuentes.medio, fontSize: 14 },
});
