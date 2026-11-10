import { Car, Clock, HandCoins, type Icon, Prohibit, XCircle } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Boton, Texto } from '@/components/ui';
import { fechaCorta, plata } from '@/lib/formato';
import { colores, espacio, fuentes, radio, tamIcono } from '@/lib/tema';
import type { Estado, Movimiento } from '@/lib/tipos';

const ESTADOS: Record<Estado, { texto: string; icono: Icon; color: string } | null> = {
  confirmado: null,
  pendiente: { texto: 'Esperando confirmación', icono: Clock, color: colores.acento },
  rechazado: { texto: 'Rechazado', icono: XCircle, color: colores.textoSuave },
  anulado: { texto: 'Anulado', icono: Prohibit, color: colores.textoSuave },
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
  const estado = ESTADOS[movimiento.estado];
  const cuenta = movimiento.estado === 'confirmado';
  const tachado = movimiento.estado === 'rechazado' || movimiento.estado === 'anulado';
  const fecha = esViaje ? movimiento.fecha : movimiento.created_at.slice(0, 10);
  const IconoTipo = esViaje ? Car : HandCoins;

  return (
    <View style={estilos.fila}>
      <View style={estilos.icono}>
        <IconoTipo size={tamIcono.m} color={cuenta ? colores.acento : colores.textoSuave} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">
          {nombre ? `${nombre}, ` : ''}
          {esViaje ? (nombre ? 'viaje' : 'Viaje') : nombre ? 'pago' : 'Pago'}
        </Texto>
        <Texto variante="suave" numberOfLines={1}>
          {fechaCorta(fecha)}
          {!esViaje && movimiento.nota ? ` · ${movimiento.nota}` : ''}
        </Texto>
        {estado ? (
          <View style={estilos.estado}>
            <estado.icono size={14} color={estado.color} />
            <Text style={[estilos.estadoTexto, { color: estado.color }]}>{estado.texto}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: espacio.xs }}>
        <Text
          style={[
            estilos.monto,
            // Viajes suman deuda (dorado), pagos la bajan (texto normal)
            { color: esViaje ? colores.acento : colores.texto },
            !cuenta && { color: colores.textoSuave },
            tachado && estilos.tachado,
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
  if (movimientos.length === 0) {
    return (
      <View style={[estilos.lista, estilos.vacio]}>
        <Car size={tamIcono.l} color={colores.textoSuave} />
        <Texto variante="suave" style={{ textAlign: 'center' }}>
          {vacio}
        </Texto>
      </View>
    );
  }
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
  vacio: { alignItems: 'center', gap: espacio.s, paddingVertical: espacio.xl },
  separador: { borderTopWidth: 1, borderTopColor: colores.borde },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: espacio.m },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radio.m,
    backgroundColor: colores.superficie2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  estadoTexto: { fontSize: 13, fontFamily: fuentes.medio },
  monto: { fontSize: 16, fontFamily: fuentes.semi, fontVariant: ['tabular-nums'] },
  tachado: { textDecorationLine: 'line-through' },
});
