import { StyleSheet, Text, View } from 'react-native';

import { Boton, Texto } from '@/components/ui';
import { fechaCorta, plata } from '@/lib/formato';
import { colores, espacio, radio } from '@/lib/tema';
import type { Estado, Movimiento } from '@/lib/tipos';

const ETIQUETA_ESTADO: Record<Estado, { texto: string; color: string } | null> = {
  confirmado: null,
  pendiente: { texto: 'Esperando confirmación', color: colores.pendiente },
  rechazado: { texto: 'Rechazado', color: colores.textoSuave },
  anulado: { texto: 'Anulado', color: colores.textoSuave },
};

export function FilaMovimiento({
  movimiento,
  nombre,
  alAnular,
}: {
  movimiento: Movimiento;
  /** Nombre del pasajero (solo lo muestra el chofer) */
  nombre?: string;
  alAnular?: () => void;
}) {
  const esViaje = movimiento.tipo === 'viaje';
  const estado = ETIQUETA_ESTADO[movimiento.estado];
  const cuenta = movimiento.estado === 'confirmado';
  const fecha = esViaje ? movimiento.fecha : movimiento.created_at.slice(0, 10);

  return (
    <View style={estilos.fila}>
      <Text style={estilos.icono}>{esViaje ? '🚗' : '💵'}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto style={{ fontWeight: '600' }}>
          {nombre ? `${nombre} · ` : ''}
          {esViaje ? 'Viaje' : 'Pago'}
        </Texto>
        <Texto variante="suave">
          {fechaCorta(fecha)}
          {!esViaje && movimiento.nota ? ` · ${movimiento.nota}` : ''}
        </Texto>
        {estado ? <Text style={[estilos.estado, { color: estado.color }]}>{estado.texto}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: espacio.xs }}>
        <Text
          style={[
            estilos.monto,
            { color: esViaje ? colores.deuda : colores.acento },
            !cuenta && { color: colores.textoSuave },
            (movimiento.estado === 'rechazado' || movimiento.estado === 'anulado') && estilos.tachado,
          ]}
        >
          {esViaje ? '+' : '−'} {plata(movimiento.monto)}
        </Text>
        {alAnular && cuenta ? <Boton titulo="Anular" tipo="texto" chico alTocar={alAnular} /> : null}
      </View>
    </View>
  );
}

export function ListaMovimientos({
  movimientos,
  nombres,
  alAnular,
  vacio = 'Todavía no hay movimientos.',
}: {
  movimientos: Movimiento[];
  nombres?: Record<string, string>;
  alAnular?: (m: Movimiento) => void;
  vacio?: string;
}) {
  if (movimientos.length === 0) return <Texto variante="suave">{vacio}</Texto>;
  return (
    <View style={estilos.lista}>
      {movimientos.map((m, i) => (
        <View key={`${m.tipo}-${m.id}`} style={i > 0 && estilos.separador}>
          <FilaMovimiento
            movimiento={m}
            nombre={nombres?.[m.pasajero_id]}
            alAnular={alAnular ? () => alAnular(m) : undefined}
          />
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.l,
    paddingHorizontal: espacio.l,
  },
  separador: { borderTopWidth: 1, borderTopColor: colores.borde },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: espacio.m },
  icono: { fontSize: 22 },
  estado: { fontSize: 13, fontWeight: '600' },
  monto: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
});
