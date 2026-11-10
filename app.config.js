// Toma app.json y, si hay un ícono propio en assets/local (no se sube al repo),
// lo usa para la app y el favicon de la web.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const icono = path.join(__dirname, 'assets', 'local', 'icon.png');
  const favicon = path.join(__dirname, 'assets', 'local', 'favicon.png');
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
        foregroundImage: './assets/local/icon.png',
      },
    },
  };
};
