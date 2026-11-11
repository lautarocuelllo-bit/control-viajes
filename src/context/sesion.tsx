import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Grupo, Perfil } from '@/lib/tipos';

type Rol = 'chofer' | 'pasajero';

type ValorSesion = {
  cargando: boolean;
  sesion: Session | null;
  perfil: Perfil | null;
  grupo: Grupo | null;
  rol: Rol | null;
  /** Vuelve a leer el perfil y el grupo (después de crear o unirse a uno) */
  recargar: () => Promise<void>;
  salir: () => Promise<void>;
};

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  const cargarDatos = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setPerfil(null);
      setGrupo(null);
      setRol(null);
      return;
    }
    setCargandoDatos(true);
    try {
      const [{ data: miPerfil }, { data: comoChofer }, { data: comoPasajero }] = await Promise.all([
        supabase.from('perfiles').select('id, nombre').eq('id', uid).maybeSingle(),
        supabase.from('grupos').select('*').eq('chofer_id', uid).order('created_at').limit(1),
        supabase
          .from('miembros')
          .select('grupos(*)')
          .eq('perfil_id', uid)
          .is('salio_at', null)
          .order('unido_at')
          .limit(1),
      ]);

      setPerfil(miPerfil ?? null);
      const grupoChofer = comoChofer?.[0] as Grupo | undefined;
      const grupoPasajero = (comoPasajero?.[0] as { grupos: Grupo | null } | undefined)?.grupos ?? undefined;

      if (grupoChofer) {
        setGrupo(grupoChofer);
        setRol('chofer');
      } else if (grupoPasajero) {
        setGrupo(grupoPasajero);
        setRol('pasajero');
      } else {
        setGrupo(null);
        setRol(null);
      }
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSesion(data.session);
      await cargarDatos(data.session?.user.id);
      setCargandoSesion(false);
    });

    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      // Al renovar el token no cambia nada de los datos
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') {
        // No se puede usar await dentro de este callback (bloquea a supabase-js)
        setTimeout(() => cargarDatos(nuevaSesion?.user.id), 0);
      }
    });
    return () => suscripcion.subscription.unsubscribe();
  }, [cargarDatos]);

  const recargar = useCallback(() => cargarDatos(sesion?.user.id), [cargarDatos, sesion?.user.id]);

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <ContextoSesion.Provider
      value={{
        cargando: cargandoSesion || (cargandoDatos && !perfil),
        sesion,
        perfil,
        grupo,
        rol,
        recargar,
        salir,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

export function useSesion() {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion tiene que usarse dentro de ProveedorSesion');
  return valor;
}
