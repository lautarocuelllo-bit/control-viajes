// Toma app.json y, si hay un ícono propio en assets/local (no se sube al repo),
// lo usa para la app y el favicon de la web.
const fs = require('fs');
const path = require('path');

// "1.2.3" -> 10203. Android necesita un número que suba en cada versión
// para instalar el APK nuevo encima del anterior.
function versionCode(version) {
  const [mayor = 0, menor = 0, parche = 0] = String(version).split('.').map(Number);
  return mayor * 10000 + menor * 100 + parche;
}

module.exports = ({ config }) => {
  config = { ...config, android: { ...config.android, versionCode: versionCode(config.version) } };
  const icono = path.join(__dirname, 'assets', 'local', 'icon.png');
  const favicon = path.join(__dirname, 'assets', 'local', 'favicon.png');
  // Android recorta el ícono en círculo: el frente lleva margen alrededor
  const frenteAndroid = path.join(__dirname, 'assets', 'local', 'android-foreground.png');
  if (!fs.existsSync(icono)) return config;

  return {
    ...config,
    icon: './assets/local/icon.png',
    web: {
      ...config.web,
      favicon: fs.existsSync(favicon) ? './assets/local/favicon.png' : config.web?.favicon,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        backgroundColor: config.android?.adaptiveIcon?.backgroundColor ?? '#0c0c0d',
        foregroundImage: fs.existsSync(frenteAndroid) ? './assets/local/android-foreground.png' : './assets/local/icon.png',
      },
    },
  };
};
