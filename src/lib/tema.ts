// Paleta negro y dorado. Un solo acento (dorado) en toda la app:
// botones principales, montos que se deben y estados importantes.
// Nada de negro ni blanco puros: se usan casi-negro y casi-blanco.
export const colores = {
  fondo: '#0c0c0d',
  superficie: '#151516',
  superficie2: '#1d1d1f',
  borde: '#2b2b2e',
  texto: '#f2f1ee',
  textoSuave: '#a3a3a8', // 7,6:1 sobre el fondo (AA)
  acento: '#d6ab3a', // dorado
  acentoSuave: 'rgba(214, 171, 58, 0.12)',
  acentoBorde: 'rgba(214, 171, 58, 0.45)',
  acentoTexto: '#141414', // texto sobre botón dorado: 8,6:1
  peligro: '#ef5350', // solo para errores y acciones destructivas
} as const;

// Outfit con una familia por peso (en Android fontWeight no elige el archivo)
export const fuentes = {
  regular: 'Outfit_400Regular',
  medio: 'Outfit_500Medium',
  semi: 'Outfit_600SemiBold',
  negrita: 'Outfit_700Bold',
  extra: 'Outfit_800ExtraBold',
} as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

// Regla de radios: todo lo interactivo (botones, campos, casillas) 12,
// contenedores (tarjetas y listas) 16, botones redondos de íconos 999.
export const radio = { m: 12, l: 16, pill: 999 } as const;

export const tamIcono = { s: 18, m: 22, l: 28 } as const;
