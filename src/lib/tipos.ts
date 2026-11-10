export type Estado = 'pendiente' | 'confirmado' | 'rechazado' | 'anulado';

export type Perfil = { id: string; nombre: string };

export type Grupo = {
  id: string;
  nombre: string;
  chofer_id: string;
  precio_viaje: number;
  codigo: string;
};

export type Viaje = {
  id: string;
  grupo_id: string;
  pasajero_id: string;
  fecha: string;
  monto: number;
  estado: Estado;
  created_at: string;
};

export type Pago = {
  id: string;
  grupo_id: string;
  pasajero_id: string;
  monto: number;
  nota: string | null;
  estado: Estado;
  created_at: string;
};

export type Saldo = {
  grupo_id: string;
  pasajero_id: string;
  total_viajes: number;
  cantidad_viajes: number;
  total_pagos: number;
  saldo: number;
};

/** Viajes y pagos mezclados en una sola lista, ordenada por fecha */
export type Movimiento =
  | ({ tipo: 'viaje'; orden: string } & Viaje)
  | ({ tipo: 'pago'; orden: string } & Pago);

export function mezclarMovimientos(viajes: Viaje[], pagos: Pago[]): Movimiento[] {
  return [
    ...viajes.map((v) => ({ ...v, tipo: 'viaje' as const, orden: `${v.fecha}T${v.created_at.slice(11)}` })),
    ...pagos.map((p) => ({ ...p, tipo: 'pago' as const, orden: p.created_at })),
  ].sort((a, b) => b.orden.localeCompare(a.orden));
}
