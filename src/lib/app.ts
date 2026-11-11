import Constants from 'expo-constants';

/** Repositorio donde se publican los APK (scripts/publicar-apk.ps1) */
export const REPO = 'lautarocuelllo-bit/control-viajes';

/** Link fijo que siempre descarga el APK más nuevo */
export const URL_APK = `https://github.com/${REPO}/releases/latest/download/control-viajes.apk`;

/** Versión instalada (la de app.json al compilar) */
export const VERSION_APP = Constants.expoConfig?.version ?? '0.0.0';

/** ¿La versión a es más nueva que b? ("1.10.0" > "1.9.2") */
export function esMasNueva(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diferencia = (pa[i] || 0) - (pb[i] || 0);
    if (diferencia !== 0) return diferencia > 0;
  }
  return false;
}
