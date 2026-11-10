import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { IconContext } from 'phosphor-react-native';
import { View } from 'react-native';
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
  const [fuentesListas, errorFuentes] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
  });

  // Mientras cargan las fuentes, solo el fondo (si fallan, sigue con la del sistema)
  if (!fuentesListas && !errorFuentes) {
    return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  }

  return (
    <SafeAreaProvider>
      {/* Todos los íconos: mismo color base y mismo grosor */}
      <IconContext.Provider value={{ color: colores.texto, size: 22, weight: 'regular' }}>
        <ProveedorSesion>
          <StatusBar style="light" />
          <Navegacion />
        </ProveedorSesion>
      </IconContext.Provider>
    </SafeAreaProvider>
  );
}
