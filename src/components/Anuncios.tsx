import { DownloadSimple, Export, PlusSquare, Sparkle } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Boton, Tarjeta, Texto } from '@/components/ui';
import { esMasNueva, REPO, URL_APK, VERSION_APP } from '@/lib/app';
import { colores, espacio, fuentes, tamIcono } from '@/lib/tema';

/** Avisos de arriba de la pantalla: versión nueva del APK o cómo instalar en iPhone */
export function Anuncios() {
  if (Platform.OS === 'android') return <VersionNueva />;
  if (Platform.OS === 'web') return <InstalarEnIphone />;
  return null;
}

// localStorage existe en la web y en el celular (lo instala expo-sqlite)
function leer(clave: string) {
  try {
    return globalThis.localStorage?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: string) {
  try {
    globalThis.localStorage?.setItem(clave, valor);
  } catch {
    // Sin almacenamiento el aviso vuelve a aparecer la próxima vez: no pasa nada
  }
}

// ---------- Android: hay un APK más nuevo en GitHub ----------

const CLAVE_VERSION = 'version-descartada';
const CLAVE_ULTIMA = 'ultima-version-publicada';
const UNA_HORA = 60 * 60 * 1000;

type Publicada = { version: string; notas: string; revisado: number };

/**
 * Versión del último release de GitHub. Se consulta como mucho una vez por hora:
 * la API de GitHub deja 60 consultas por hora por red (un wifi compartido llega rápido).
 * Si la API no responde, se lee la versión de la redirección de /releases/latest.
 */
async function ultimaPublicada(): Promise<Publicada | null> {
  const guardada = leer(CLAVE_ULTIMA);
  try {
    const previa = guardada ? (JSON.parse(guardada) as Publicada) : null;
    if (previa && Date.now() - previa.revisado < UNA_HORA) return previa;
  } catch {
    // Dato guardado roto: se vuelve a consultar
  }

  let version: string | undefined;
  let notas = '';
  const api = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  }).catch(() => null);
  if (api?.ok) {
    const release = (await api.json()) as { tag_name?: string; body?: string };
    version = release.tag_name;
    notas = release.body?.trim() ?? '';
  } else {
    // https://github.com/.../releases/latest redirige a .../releases/tag/v1.2.0
    const pagina = await fetch(`https://github.com/${REPO}/releases/latest`).catch(() => null);
    version = pagina?.url.match(/\/tag\/([^/?#]+)/)?.[1];
  }
  if (!version) return null;

  const publicada = { version: version.replace(/^v/, ''), notas, revisado: Date.now() };
  guardar(CLAVE_ULTIMA, JSON.stringify(publicada));
  return publicada;
}

function VersionNueva() {
  const [nueva, setNueva] = useState<{ version: string; notas: string } | null>(null);

  useEffect(() => {
    let vigente = true;
    ultimaPublicada()
      .then((publicada) => {
        if (!vigente || !publicada) return;
        if (esMasNueva(publicada.version, VERSION_APP) && leer(CLAVE_VERSION) !== publicada.version) {
          setNueva(publicada);
        }
      })
      // Sin internet o GitHub caído: no se muestra nada
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  if (!nueva) return null;

  return (
    <Tarjeta style={estilos.tarjeta}>
      <View style={estilos.titulo}>
        <Sparkle size={tamIcono.m} color={colores.acento} weight="fill" />
        <Texto variante="subtitulo">Hay una versión nueva</Texto>
      </View>
      <Texto variante="suave">
        Tenés la {VERSION_APP} y ya salió la {nueva.version}. Tocá Actualizar, abrí el archivo que se descarga e
        instalalo encima: no perdés nada.
      </Texto>
      {nueva.notas ? <Text style={estilos.notas}>{nueva.notas}</Text> : null}
      <Boton titulo="Actualizar" icono={DownloadSimple} alTocar={() => Linking.openURL(URL_APK)} />
      <Boton
        titulo="Más tarde"
        tipo="texto"
        chico
        alTocar={() => {
          guardar(CLAVE_VERSION, nueva.version);
          setNueva(null);
        }}
      />
    </Tarjeta>
  );
}

// ---------- iPhone: cómo agregarla a la pantalla de inicio ----------

const CLAVE_IPHONE = 'aviso-iphone-oculto';

function esIphoneEnSafari() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const esIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  // Ya instalada: se abre sola, sin la barra de Safari
  const instalada =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches;
  return esIos && !instalada;
}

function InstalarEnIphone() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(esIphoneEnSafari() && leer(CLAVE_IPHONE) !== 'si');
  }, []);

  if (!visible) return null;

  return (
    <Tarjeta style={estilos.tarjeta}>
      <View style={estilos.titulo}>
        <PlusSquare size={tamIcono.m} color={colores.acento} weight="fill" />
        <Texto variante="subtitulo">Instalala en tu iPhone</Texto>
      </View>
      <View style={{ gap: espacio.s }}>
        <Paso numero={1}>
          Tocá <Export size={16} color={colores.texto} /> <Text style={estilos.fuerte}>Compartir</Text> en la barra de
          Safari.
        </Paso>
        <Paso numero={2}>
          Elegí <Text style={estilos.fuerte}>Agregar a inicio</Text>.
        </Paso>
        <Paso numero={3}>Abrila desde el ícono: se ve como una app, sin la barra del navegador.</Paso>
      </View>
      <Boton
        titulo="Entendido"
        tipo="texto"
        chico
        alTocar={() => {
          guardar(CLAVE_IPHONE, 'si');
          setVisible(false);
        }}
      />
    </Tarjeta>
  );
}

function Paso({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <View style={estilos.paso}>
      <View style={estilos.numero}>
        <Text style={estilos.numeroTexto}>{numero}</Text>
      </View>
      <Text style={estilos.pasoTexto}>{children}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderColor: colores.acentoBorde, backgroundColor: colores.acentoSuave },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  notas: { color: colores.textoSuave, fontFamily: fuentes.regular, fontSize: 14, lineHeight: 20 },
  fuerte: { fontFamily: fuentes.semi, color: colores.texto },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.m },
  numero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numeroTexto: { color: colores.acentoTexto, fontFamily: fuentes.negrita, fontSize: 13 },
  pasoTexto: { flex: 1, color: colores.texto, fontFamily: fuentes.regular, fontSize: 15, lineHeight: 22 },
});
