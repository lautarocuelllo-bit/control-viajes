import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Cargando } from '@/components/ui';
import { ProveedorSesion, useSesion } from '@/context/sesion';
import { colores } from '@/lib/tema';

function Navegacion() {
  const { cargando, sesion, grupo, rol } = useSesion();

  if (cargando) return <Cargando />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="ingresar" />
        <Stack.Screen name="registro" />
      </Stack.Protected>

      <Stack.Protected guard={!!sesion && !grupo}>
        <Stack.Screen name="empezar" />
      </Stack.Protected>

      <Stack.Protected guard={!!sesion && rol === 'chofer'}>
        <Stack.Screen name="chofer" />
      </Stack.Protected>

      <Stack.Protected guard={!!sesion && rol === 'pasajero'}>
        <Stack.Screen name="pasajero" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <StatusBar style="light" />
        <Navegacion />
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}
