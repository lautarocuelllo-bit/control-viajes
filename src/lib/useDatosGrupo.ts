import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Pago, Perfil, Saldo, Viaje } from '@/lib/tipos';

type Datos = {
  /** Pasajeros del grupo (el chofer ve a todos; el pasajero solo a sí mismo) */
  pasajeros: Perfil[];
  saldos: Saldo[];
  viajes: Viaje[];
  pagos: Pago[];
};

const VACIO: Datos = { pasajeros: [], saldos: [], viajes: [], pagos: [] };

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
    const [miembros, saldos, viajes, pagos] = await Promise.all([
      supabase.from('miembros').select('perfiles(id, nombre)').eq('grupo_id', grupoId),
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
    ]);

    const fallo = miembros.error ?? saldos.error ?? viajes.error ?? pagos.error;
    if (fallo) {
      setError('No se pudieron cargar los datos. Deslizá hacia abajo para reintentar.');
      return;
    }
    setError(null);
    setDatos({
      pasajeros: (miembros.data ?? [])
        .map((m) => (m as unknown as { perfiles: Perfil | null }).perfiles)
        .filter((p): p is Perfil => !!p)
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      saldos: (saldos.data ?? []) as Saldo[],
      viajes: (viajes.data ?? []) as Viaje[],
      pagos: (pagos.data ?? []) as Pago[],
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'miembros', filter: filtro }, recargarPronto)
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

  return { ...datos, cargando, recargando, error, recargar };
}
