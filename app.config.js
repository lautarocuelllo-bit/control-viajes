// Toma app.json y calcula el versionCode de Android a partir de la versión:
// "1.2.3" -> 10203. Android necesita un número que suba en cada versión
// para instalar el APK nuevo encima del anterior.
function versionCode(version) {
  const [mayor = 0, menor = 0, parche = 0] = String(version).split('.').map(Number);
  return mayor * 10000 + menor * 100 + parche;
}

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: versionCode(config.version) },
});
