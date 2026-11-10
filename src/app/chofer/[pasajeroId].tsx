import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ListaMovimientos } from '@/components/Movimientos';
import { Boton, Campo, Cargando, confirmar, MensajeError, Pantalla, Seccion, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { plata } from '@/lib/formato';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio } from '@/lib/tema';
import { mezclarMovimientos, type Movimiento } from '@/lib/tipos';
import { useDatosGrupo } from '@/lib/useDatosGrupo';

export default function DetallePasajero() {
  const { pasajeroId } = useLocalSearchParams<{ pasajeroId: string }>();
  const { grupo } = useSesion();
  const datos = useDatosGrupo(grupo?.id);

  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const pasajero = datos.pasajeros.find((p) => p.id === pasajeroId);
  const saldo = datos.saldos.find((s) => s.pasajero_id === pasajeroId);
  const movimientos = useMemo(
    () =>
      mezclarMovimientos(
        datos.viajes.filter((v) => v.pasajero_id === pasajeroId),
        datos.pagos.filter((p) => p.pasajero_id === pasajeroId)
      ),
    [datos.viajes, datos.pagos, pasajeroId]
  );

  if (!grupo) return null;
  if (datos.cargando) return <Cargando />;
  if (!pasajero) {
    return (
      <Pantalla>
        <Texto variante="suave">Esta persona ya no está en el grupo.</Texto>
      </Pantalla>
    );
  }

  const debe = saldo?.saldo ?? 0;

  async function registrarPago() {
    if (!grupo) return;
    const valor = Number(monto.replace(/\D/g, ''));
    if (!valor) return setError('Poné cuánto te pagó.');
    setGuardando(true);
    setError(null);
    const { error } = await supabase.rpc('registrar_pago', {
      p_grupo: grupo.id,
      p_pasajero: pasajeroId,
      p_monto: valor,
      p_nota: nota.trim() || null,
    });
    setGuardando(false);
    if (error) return setError(mensajeDeError(error));
    setMonto('');
    setNota('');
    setMensaje(`Pago de ${plata(valor)} registrado.`);
    datos.recargar();
  }

  async function anular(m: Movimiento) {
    const que = m.tipo === 'viaje' ? 'este viaje' : 'este pago';
    const ok = await confirmar(`¿Anular ${que}?`, `Se descuenta del saldo de ${pasajero?.nombre}. Queda en el historial como anulado.`, 'Anular');
    if (!ok) return;
    const { error } = await supabase.rpc('anular_movimiento', { p_tipo: m.tipo, p_id: m.id });
    if (error) return setError(mensajeDeError(error));
    datos.recargar();
  }

  return (
    <Pantalla recargando={datos.recargando} alRecargar={datos.recargar}>
      <Stack.Screen options={{ title: pasajero.nombre }} />

      <Tarjeta>
        <Texto variante="etiqueta">{debe > 0 ? 'Te debe' : debe < 0 ? 'Tiene a favor' : 'Saldo'}</Texto>
        <Text style={{ color: debe > 0 ? colores.deuda : colores.acento, fontSize: 40, fontWeight: '800' }}>
          {debe === 0 ? 'Al día' : plata(Math.abs(debe))}
        </Text>
        <Texto variante="suave">
          {saldo?.cantidad_viajes ?? 0} {saldo?.cantidad_viajes === 1 ? 'viaje' : 'viajes'} por{' '}
          {plata(saldo?.total_viajes ?? 0)} · pagó {plata(saldo?.total_pagos ?? 0)}
        </Texto>
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Registrar un pago que recibiste</Texto>
        <Campo
          etiqueta="Monto"
          value={monto}
          onChangeText={(t) => setMonto(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="Ej: 5000"
        />
        {debe > 0 ? (
          <Boton titulo={`Pagó todo (${plata(debe)})`} tipo="texto" chico alTocar={() => setMonto(String(debe))} />
        ) : null}
        <Campo etiqueta="Nota (opcional)" value={nota} onChangeText={setNota} placeholder="Efectivo, transferencia…" maxLength={120} />
        {mensaje ? <Text style={{ color: colores.acento }}>{mensaje}</Text> : null}
        <MensajeError mensaje={error} />
        <Boton titulo="Registrar pago" alTocar={registrarPago} cargando={guardando} />
      </Tarjeta>

      <Seccion titulo="Historial">
        <View style={{ gap: espacio.s }}>
          <ListaMovimientos movimientos={movimientos} alAnular={anular} />
        </View>
      </Seccion>
    </Pantalla>
  );
}
