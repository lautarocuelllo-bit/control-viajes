// Logo propio opcional: si existe assets/local/logo.png (no se sube al repo),
// el módulo "@logo-local" es esa imagen. Si no existe, es un módulo vacío
// y la app muestra la marca por defecto.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const logoLocal = path.join(__dirname, 'assets', 'local', 'logo.png');
const resolverOriginal = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@logo-local') {
    return fs.existsSync(logoLocal)
      ? context.resolveRequest(context, logoLocal, platform)
      : { type: 'empty' };
  }
  return (resolverOriginal ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
