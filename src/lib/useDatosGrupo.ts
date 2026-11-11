import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { DeudaAnterior, Pago, Perfil, Saldo, Viaje } from '@/lib/tipos';

type Datos = {
  /** Pasajeros del grupo (el chofer ve a todos; el pasajero solo a sí mismo) */
  pasajeros: Perfil[];
  /** Los que se fueron o el chofer quitó (solo los ve el chofer) */
  exPasajeros: Perfil[];
  saldos: Saldo[];
  viajes: Viaje[];
  pagos: Pago[];
  deudas: DeudaAnterior[];
};

const VACIO: Datos = { pasajeros: [], exPasajeros: [], saldos: [], viajes: [], pagos: [], deudas: [] };

/**
 * Carga todo lo del grupo y se vuelve a cargar solo cuando alguien
 * registra, confirma o anula algo (tiempo real de Supabase).
 * Las reglas de la base deciden qué ve cada uno.
 */
export function useDatosGrupo(grupoId: string | undefined, alCambiarGrupo?: () => void) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alCambiarGrupoRef = useRef(alCambiarGrupo);
  alCambiarGrupoRef.current = alCambiarGrupo;

  const cargar = useCallback(async () => {
    if (!grupoId) return;
    const [miembros, saldos, viajes, pagos, deudas] = await Promise.all([
      supabase.from('miembros').select('salio_at, perfiles(id, nombre)').eq('grupo_id', grupoId),
      supabase.from('saldos').select('*').eq('grupo_id', grupoId),
      supabase
        .from('viajes')
        .select('id, grupo_id, pasajero_id, fecha, monto, estado, created_at')
        .eq('grupo_id', grupoId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('pagos')
        .select('id, grupo_id, pasajero_id, monto, nota, estado, created_at')
        .eq('grupo_id', grupoId)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase
        .from('deudas_anteriores')
        .select('id, grupo_id, pasajero_id, monto, nota, estado, created_at')
        .eq('grupo_id', grupoId)
        .order('created_at', { ascending: false }),
    ]);

    const fallo = miembros.error ?? saldos.error ?? viajes.error ?? pagos.error ?? deudas.error;
    if (fallo) {
      setError('No se pudieron cargar los datos. Deslizá hacia abajo para reintentar.');
      return;
    }
    setError(null);
    const filas = (miembros.data ?? []) as unknown as { salio_at: string | null; perfiles: Perfil | null }[];
    const personas = (activos: boolean) =>
      filas
        .filter((m) => !!m.perfiles && (m.salio_at === null) === activos)
        .map((m) => m.perfiles as Perfil)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    setDatos({
      pasajeros: personas(true),
      exPasajeros: personas(false),
      saldos: (saldos.data ?? []) as Saldo[],
      viajes: (viajes.data ?? []) as Viaje[],
      pagos: (pagos.data ?? []) as Pago[],
      deudas: (deudas.data ?? []) as DeudaAnterior[],
    });
  }, [grupoId]);

  useEffect(() => {
    setCargando(true);
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  // Tiempo real: cualquier cambio en el grupo vuelve a cargar los datos
  useEffect(() => {
    if (!grupoId) return;
    let pendiente: ReturnType<typeof setTimeout> | undefined;
    const recargarPronto = () => {
      clearTimeout(pendiente);
      pendiente = setTimeout(cargar, 250); // agrupa varios cambios seguidos
    };
    const filtro = `grupo_id=eq.${grupoId}`;
    const canal = supabase
      // Nombre único: si dos pantallas escuchan el mismo grupo, cada una tiene su canal
      .channel(`grupo-${grupoId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes', filter: filtro }, recargarPronto)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos', filter: filtro }, recargarPronto)
      // Si alguien sale o lo quitan, también cambia la sesión de esa persona
      .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros', filter: filtro }, () => {
        recargarPronto();
        alCambiarGrupoRef.current?.();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas_anteriores', filter: filtro }, recargarPronto)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'grupos', filter: `id=eq.${grupoId}` }, () =>
        alCambiarGrupoRef.current?.()
      )
      .subscribe();
    return () => {
      clearTimeout(pendiente);
      supabase.removeChannel(canal);
    };
  }, [grupoId, cargar]);

  const recargar = useCallback(async () => {
    setRecargando(true);
    await Promise.all([cargar(), alCambiarGrupoRef.current?.()]);
    setRecargando(false);
  }, [cargar]);

  // refrescar: vuelve a cargar sin mostrar el indicador (al volver a una pantalla)
  return { ...datos, cargando, recargando, error, recargar, refrescar: cargar };
}
