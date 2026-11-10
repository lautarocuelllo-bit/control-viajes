import { Redirect } from 'expo-router';

import { useSesion } from '@/context/sesion';

// Manda a cada uno a su pantalla según en qué punto está
export default function Inicio() {
  const { sesion, grupo, rol } = useSesion();

  if (!sesion) return <Redirect href="/ingresar" />;
  if (!grupo) return <Redirect href="/empezar" />;
  return <Redirect href={rol === 'chofer' ? '/chofer' : '/pasajero'} />;
}
