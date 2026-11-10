import './almacenamiento';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example como .env.local y completalo.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: globalThis.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// En el celular, renovar la sesión solo mientras la app está abierta
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Los errores de las funciones de la base vienen con el mensaje en español
// (los escribimos nosotros en el SQL). Los de Supabase Auth vienen en inglés.
const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, 'El email o la contraseña no son correctos.'],
  [/user already registered/i, 'Ya hay una cuenta con ese email.'],
  [/password should be at least/i, 'La contraseña tiene que tener al menos 6 caracteres.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu email. Revisá tu casilla.'],
  [/unable to validate email|invalid email/i, 'Ese email no es válido.'],
  [/rate limit|too many requests/i, 'Demasiados intentos. Esperá un minuto y probá de nuevo.'],
  [/failed to fetch|network request failed/i, 'No hay conexión. Revisá internet y probá de nuevo.'],
];

export function mensajeDeError(error: unknown): string {
  const mensaje =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  const traducido = TRADUCCIONES.find(([patron]) => patron.test(mensaje));
  return traducido ? traducido[1] : mensaje;
}
