import { Car } from 'phosphor-react-native';
import { Image, ImageSourcePropType, View } from 'react-native';

import { colores, radio } from '@/lib/tema';

// Logo propio opcional (assets/local/logo.png, no está en el repo).
// metro.config.js lo resuelve; si no existe llega un módulo vacío.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const modulo = require('@logo-local');
const fuente = (modulo?.default ?? modulo) as ImageSourcePropType | Record<string, never> | undefined;
const logoLocal =
  typeof fuente === 'number' || typeof fuente === 'string' || (fuente && Object.keys(fuente).length > 0)
    ? (fuente as ImageSourcePropType)
    : null;

/** Marca de la app: el logo propio si existe, si no un auto sobre un cuadrado dorado */
export function Marca({ tam = 56 }: { tam?: number }) {
  if (logoLocal) {
    return (
      <Image
        source={logoLocal}
        accessible={false}
        style={{
          width: tam,
          height: tam,
          borderRadius: radio.l,
          borderWidth: 1.5,
          borderColor: colores.acento,
        }}
      />
    );
  }

  return (
    <View
      accessible={false}
      style={{
        width: tam,
        height: tam,
        borderRadius: radio.l,
        backgroundColor: colores.acento,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Car size={tam * 0.56} color={colores.acentoTexto} weight="fill" />
    </View>
  );
}
