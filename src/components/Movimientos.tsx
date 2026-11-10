import { Car, Clock, ClockCounterClockwise, HandCoins, type Icon, Prohibit, XCircle } from 'phosphor-react-native';
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
  const estado = ESTADOS[movimiento.estado];
  const cuenta = movimiento.estado === 'confirmado';
  const tachado = movimiento.estado === 'rechazado' || movimiento.estado === 'anulado';
  const { titulo, fecha, detalle, suma, IconoTipo } = describir(movimiento);
  const monto = movimiento.tipo === 'deuda' ? Math.abs(movimiento.monto) : movimiento.monto;

  return (
    <View style={estilos.fila}>
      <View style={estilos.icono}>
        <IconoTipo size={tamIcono.m} color={cuenta ? colores.acento : colores.textoSuave} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="fuerte">{nombre ? `${nombre}, ${titulo.toLowerCase()}` : titulo}</Texto>
        <Texto variante="suave" numberOfLines={1}>
          {fechaCorta(fecha)}
          {detalle ? ` · ${detalle}` : ''}
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
            // Lo que suma deuda va en dorado, lo que la baja en texto normal
            { color: suma ? colores.acento : colores.texto },
            !cuenta && { color: colores.textoSuave },
            tachado && estilos.tachado,
          ]}
        >
          {suma ? '+' : '−'} {plata(monto)}
        </Text>
        {alAnular && cuenta ? <Boton titulo="Anular" tipo="texto" chico alTocar={alAnular} /> : null}
      </View>
    </View>
  );
}

function describir(m: Movimiento): { titulo: string; fecha: string; detalle: string | null; suma: boolean; IconoTipo: Icon } {
  switch (m.tipo) {
    case 'viaje':
      return { titulo: 'Viaje', fecha: m.fecha, detalle: null, suma: true, IconoTipo: Car };
    case 'pago':
      return { titulo: 'Pago', fecha: m.created_at.slice(0, 10), detalle: m.nota, suma: false, IconoTipo: HandCoins };
    case 'deuda':
      return {
        titulo: m.monto > 0 ? 'Deuda anterior' : 'Saldo a favor anterior',
        fecha: m.created_at.slice(0, 10),
        detalle: m.nota,
        suma: m.monto > 0,
        IconoTipo: ClockCounterClockwise,
      };
  }
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
