import { Stack } from 'expo-router';

import { colores } from '@/lib/tema';

// Si alguien entra directo a /chofer/ajustes, igual queda el panel debajo
// para poder volver con la flecha.
export const unstable_settings = { anchor: 'index' };

export default function LayoutChofer() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
        headerBackTitle: 'Volver',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="ajustes" options={{ title: 'Ajustes' }} />
      <Stack.Screen name="[pasajeroId]" options={{ title: 'Pasajero' }} />
      <Stack.Screen name="importar" options={{ title: 'Importar de viajes.py' }} />
    </Stack>
  );
}
