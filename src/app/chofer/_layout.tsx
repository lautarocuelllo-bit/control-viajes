import { Stack } from 'expo-router';

import { colores } from '@/lib/tema';

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
    </Stack>
  );
}
