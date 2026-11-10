import { Car } from 'phosphor-react-native';
import { View } from 'react-native';

import { colores, radio } from '@/lib/tema';

/** Marca de la app: auto sobre un cuadrado dorado */
export function Marca({ tam = 56 }: { tam?: number }) {
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
