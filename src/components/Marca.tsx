import { Image } from 'react-native';

import { colores, radio } from '@/lib/tema';

const logo = require('../../assets/logo.png');

/** Logo de la app con borde dorado */
export function Marca({ tam = 56 }: { tam?: number }) {
  return (
    <Image
      source={logo}
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
