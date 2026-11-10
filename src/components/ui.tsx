import { CheckCircle, Check, Eye, EyeSlash, type Icon, WarningCircle } from 'phosphor-react-native';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espacio, fuentes, radio, tamIcono } from '@/lib/tema';

// ---------- Pantalla ----------

export function Pantalla({
  children,
  recargando,
  alRecargar,
}: {
  children: ReactNode;
  recargando?: boolean;
  alRecargar?: () => void;
}) {
  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          alRecargar ? (
            <RefreshControl refreshing={!!recargando} onRefresh={alRecargar} tintColor={colores.acento} />
          ) : undefined
        }
      >
        <View style={estilos.columna}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Esqueleto con la forma de una pantalla típica (título, tarjeta grande, lista)
export function Cargando() {
  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
      <View style={[estilos.contenido, estilos.columna]} accessibilityLabel="Cargando" accessibilityRole="progressbar">
        <View style={{ gap: espacio.s, marginTop: espacio.s }}>
          <Bloque ancho="35%" alto={14} />
          <Bloque ancho="65%" alto={30} />
        </View>
        <Bloque alto={150} redondeo={radio.l} />
        <Bloque alto={52} redondeo={radio.m} />
        <Bloque alto={180} redondeo={radio.l} />
      </View>
    </SafeAreaView>
  );
}

function Bloque({ ancho = '100%', alto, redondeo = 8 }: { ancho?: `${number}%`; alto: number; redondeo?: number }) {
  return <View style={{ width: ancho, height: alto, borderRadius: redondeo, backgroundColor: colores.superficie2 }} />;
}

// ---------- Texto ----------

type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'fuerte' | 'suave' | 'etiqueta';

export function Texto({ variante = 'cuerpo', style, ...props }: TextProps & { variante?: Variante }) {
  return <Text style={[estilos.texto, estilos[variante], style]} {...props} />;
}

// ---------- Contenedores ----------

export function Tarjeta({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

export function Seccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: espacio.m }}>
      <View style={estilos.seccionCabecera}>
        <Texto variante="subtitulo" style={{ fontSize: 18 }}>
          {titulo}
        </Texto>
        {extra}
      </View>
      {children}
    </View>
  );
}

// ---------- Botones ----------

type TipoBoton = 'principal' | 'secundario' | 'peligro' | 'texto';

export function Boton({
  titulo,
  alTocar,
  tipo = 'principal',
  icono: IconoBoton,
  cargando,
  deshabilitado,
  chico,
}: {
  titulo: string;
  alTocar: () => void;
  tipo?: TipoBoton;
  icono?: Icon;
  cargando?: boolean;
  deshabilitado?: boolean;
  chico?: boolean;
}) {
  const inactivo = deshabilitado || cargando;
  const apagado = deshabilitado && tipo === 'principal';
  const colorTexto = apagado ? colores.textoSuave : COLOR_TEXTO_BOTON[tipo];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={alTocar}
      style={({ pressed }) => [
        estilos.boton,
        chico && estilos.botonChico,
        estilos[`boton_${tipo}`],
        // Deshabilitado se ve gris: un dorado apagado parece que se puede tocar
        apagado && estilos.botonApagado,
        deshabilitado && tipo !== 'principal' && { opacity: 0.45 },
        // Respuesta al tocar: se "hunde" un poco
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <View style={estilos.botonContenido}>
          {IconoBoton ? <IconoBoton color={colorTexto} size={chico ? tamIcono.s : tamIcono.m} /> : null}
          <Text numberOfLines={1} style={[estilos.botonTexto, { color: colorTexto }, chico && { fontSize: 14 }]}>
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const COLOR_TEXTO_BOTON: Record<TipoBoton, string> = {
  principal: colores.acentoTexto,
  secundario: colores.texto,
  peligro: colores.peligro,
  texto: colores.textoSuave,
};

/** Botón redondo solo con ícono (flechas, ajustes) */
export function BotonIcono({
  icono: IconoBoton,
  etiqueta,
  alTocar,
  deshabilitado,
}: {
  icono: Icon;
  etiqueta: string;
  alTocar: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !!deshabilitado }}
      disabled={deshabilitado}
      onPress={alTocar}
      hitSlop={6}
      style={({ pressed }) => [
        estilos.botonIcono,
        deshabilitado && { opacity: 0.3 },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <IconoBoton size={tamIcono.m} />
    </Pressable>
  );
}

// ---------- Campo de texto ----------

export function Campo({
  etiqueta,
  ayuda,
  contrasena,
  ...props
}: TextInputProps & { etiqueta: string; ayuda?: string; contrasena?: boolean }) {
  const [visible, setVisible] = useState(false);
  const IconoOjo = visible ? EyeSlash : Eye;

  return (
    <View style={{ gap: espacio.s }}>
      <Text style={estilos.etiquetaCampo}>{etiqueta}</Text>
      <View style={estilos.campoMarco}>
        <TextInput
          placeholderTextColor={colores.textoSuave}
          accessibilityLabel={etiqueta}
          style={[estilos.campo, contrasena && { paddingRight: 52 }]}
          secureTextEntry={contrasena && !visible}
          autoCapitalize={contrasena ? 'none' : props.autoCapitalize}
          autoCorrect={contrasena ? false : props.autoCorrect}
          {...props}
        />
        {contrasena ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            style={estilos.ojo}
          >
            <IconoOjo size={tamIcono.m} color={colores.textoSuave} />
          </Pressable>
        ) : null}
      </View>
      {ayuda ? <Texto variante="suave">{ayuda}</Texto> : null}
    </View>
  );
}

// ---------- Mensajes ----------

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <View style={[estilos.aviso, estilos.avisoError]} accessibilityRole="alert">
      <WarningCircle size={tamIcono.m} color={colores.peligro} />
      <Text style={[estilos.avisoTexto, { color: colores.peligro }]}>{mensaje}</Text>
    </View>
  );
}

/** Estado o confirmación con ícono (no es un botón) */
export function Aviso({
  texto,
  icono: IconoAviso = CheckCircle,
  tono = 'acento',
}: {
  texto: string;
  icono?: Icon;
  tono?: 'acento' | 'suave';
}) {
  const color = tono === 'acento' ? colores.acento : colores.textoSuave;
  return (
    <View
      style={[estilos.aviso, { borderColor: tono === 'acento' ? colores.acentoBorde : colores.borde }]}
      accessibilityRole="text"
    >
      <IconoAviso size={tamIcono.m} color={color} weight={tono === 'acento' ? 'fill' : 'regular'} />
      <Text style={[estilos.avisoTexto, { color }]}>{texto}</Text>
    </View>
  );
}

// ---------- Casilla para tildar ----------

export function Casilla({
  etiqueta,
  detalle,
  marcada,
  alTocar,
  deshabilitada,
}: {
  etiqueta: string;
  detalle?: string;
  marcada: boolean;
  alTocar: () => void;
  deshabilitada?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: marcada, disabled: deshabilitada }}
      disabled={deshabilitada}
      onPress={alTocar}
      style={({ pressed }) => [
        estilos.casilla,
        marcada && !deshabilitada && estilos.casillaMarcada,
        deshabilitada && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[estilos.cuadradito, marcada && estilos.cuadraditoMarcado]}>
        {marcada ? <Check size={16} color={colores.acentoTexto} weight="bold" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Texto variante="fuerte">{etiqueta}</Texto>
        {detalle ? <Texto variante="suave">{detalle}</Texto> : null}
      </View>
    </Pressable>
  );
}

// ---------- Confirmación (Alert no funciona en la web) ----------

export function confirmar(titulo: string, mensaje: string, textoAceptar = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  }
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: textoAceptar, style: 'destructive', onPress: () => resolver(true) },
    ])
  );
}

// ---------- Estilos ----------

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, paddingBottom: espacio.xxl * 2 },
  columna: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: espacio.xl },

  texto: { color: colores.texto, fontSize: 16, lineHeight: 23, fontFamily: fuentes.regular },
  titulo: { fontSize: 30, lineHeight: 36, fontFamily: fuentes.negrita, letterSpacing: -0.5 },
  subtitulo: { fontSize: 20, lineHeight: 26, fontFamily: fuentes.semi, letterSpacing: -0.2 },
  cuerpo: {},
  fuerte: { fontFamily: fuentes.semi },
  suave: { color: colores.textoSuave, fontSize: 14, lineHeight: 20 },
  etiqueta: { color: colores.textoSuave, fontSize: 14, fontFamily: fuentes.medio },

  tarjeta: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.l,
    padding: espacio.l,
    gap: espacio.m,
  },
  seccionCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },

  boton: {
    minHeight: 52,
    borderRadius: radio.m,
    paddingHorizontal: espacio.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonChico: { minHeight: 40, paddingHorizontal: espacio.m },
  boton_principal: { backgroundColor: colores.acento },
  boton_secundario: { backgroundColor: colores.superficie2, borderWidth: 1, borderColor: colores.borde },
  boton_peligro: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.peligro },
  boton_texto: { backgroundColor: 'transparent', minHeight: 40 },
  botonApagado: { backgroundColor: colores.superficie2, borderWidth: 1, borderColor: colores.borde },
  botonContenido: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  botonTexto: { fontSize: 16, fontFamily: fuentes.semi },

  botonIcono: {
    width: 44,
    height: 44,
    borderRadius: radio.pill,
    backgroundColor: colores.superficie2,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },

  etiquetaCampo: { color: colores.texto, fontSize: 14, fontFamily: fuentes.medio },
  campoMarco: { justifyContent: 'center' },
  campo: {
    backgroundColor: colores.superficie2,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.m,
    color: colores.texto,
    fontSize: 16,
    fontFamily: fuentes.regular,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.m,
    minHeight: 50,
  },
  ojo: {
    position: 'absolute',
    right: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    borderWidth: 1,
    borderRadius: radio.m,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.m,
    minHeight: 50,
  },
  avisoError: { borderColor: 'rgba(239, 83, 80, 0.5)', backgroundColor: 'rgba(239, 83, 80, 0.08)' },
  avisoTexto: { flex: 1, fontSize: 15, lineHeight: 21, fontFamily: fuentes.medio },

  casilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    minHeight: 56,
    borderRadius: radio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie2,
  },
  casillaMarcada: { borderColor: colores.acentoBorde, backgroundColor: colores.acentoSuave },
  cuadradito: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colores.textoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadraditoMarcado: { backgroundColor: colores.acento, borderColor: colores.acento },
});
