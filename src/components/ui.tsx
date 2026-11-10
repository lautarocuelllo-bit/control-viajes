import { ReactNode } from 'react';
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

import { colores, espacio, radio } from '@/lib/tema';

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
            <RefreshControl refreshing={!!recargando} onRefresh={alRecargar} tintColor={colores.textoSuave} />
          ) : undefined
        }
      >
        <View style={estilos.columna}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Cargando() {
  return (
    <View style={[estilos.pantalla, estilos.centrado]}>
      <ActivityIndicator color={colores.acento} size="large" />
    </View>
  );
}

// ---------- Texto ----------

type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'suave' | 'etiqueta';

export function Texto({ variante = 'cuerpo', style, ...props }: TextProps & { variante?: Variante }) {
  return <Text style={[estilos.texto, estilos[variante], style]} {...props} />;
}

// ---------- Tarjeta ----------

export function Tarjeta({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

export function Seccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: espacio.s }}>
      <View style={estilos.seccionCabecera}>
        <Texto variante="etiqueta">{titulo}</Texto>
        {extra}
      </View>
      {children}
    </View>
  );
}

// ---------- Botón ----------

type TipoBoton = 'principal' | 'secundario' | 'peligro' | 'texto';

export function Boton({
  titulo,
  alTocar,
  tipo = 'principal',
  cargando,
  deshabilitado,
  chico,
}: {
  titulo: string;
  alTocar: () => void;
  tipo?: TipoBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
  chico?: boolean;
}) {
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      onPress={alTocar}
      style={({ pressed }) => [
        estilos.boton,
        chico && estilos.botonChico,
        estilos[`boton_${tipo}`],
        pressed && { opacity: 0.8 },
        inactivo && { opacity: 0.5 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={tipo === 'principal' ? colores.acentoTexto : colores.texto} />
      ) : (
        <Text style={[estilos.botonTexto, estilos[`botonTexto_${tipo}`], chico && { fontSize: 14 }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

// ---------- Campo de texto ----------

export function Campo({ etiqueta, ayuda, ...props }: TextInputProps & { etiqueta: string; ayuda?: string }) {
  return (
    <View style={{ gap: espacio.xs }}>
      <Texto variante="etiqueta" style={{ textTransform: 'none', letterSpacing: 0 }}>
        {etiqueta}
      </Texto>
      <TextInput
        placeholderTextColor={colores.textoSuave}
        accessibilityLabel={etiqueta}
        style={estilos.campo}
        {...props}
      />
      {ayuda ? <Texto variante="suave">{ayuda}</Texto> : null}
    </View>
  );
}

// ---------- Mensajes ----------

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <View style={estilos.error} accessibilityRole="alert">
      <Text style={{ color: colores.peligro }}>{mensaje}</Text>
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
      accessibilityState={{ checked: marcada, disabled: deshabilitada }}
      disabled={deshabilitada}
      onPress={alTocar}
      style={[estilos.casilla, marcada && estilos.casillaMarcada, deshabilitada && { opacity: 0.55 }]}
    >
      <View style={[estilos.cuadradito, marcada && estilos.cuadraditoMarcado]}>
        {marcada ? <Text style={{ color: colores.acentoTexto, fontWeight: '800' }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[estilos.texto, { fontSize: 16, fontWeight: '600' }]}>{etiqueta}</Text>
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

export function avisar(titulo: string, mensaje?: string) {
  if (Platform.OS === 'web') window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
  else Alert.alert(titulo, mensaje);
}

// ---------- Estilos ----------

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: espacio.l, paddingBottom: espacio.xxl * 2 },
  columna: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: espacio.xl },

  texto: { color: colores.texto, fontSize: 16, lineHeight: 22 },
  titulo: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitulo: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  cuerpo: {},
  suave: { color: colores.textoSuave, fontSize: 14, lineHeight: 20 },
  etiqueta: {
    color: colores.textoSuave,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  tarjeta: {
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.l,
    padding: espacio.l,
    gap: espacio.m,
  },
  seccionCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  boton: {
    minHeight: 50,
    borderRadius: radio.m,
    paddingHorizontal: espacio.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonChico: { minHeight: 38, paddingHorizontal: espacio.m, borderRadius: radio.s },
  boton_principal: { backgroundColor: colores.acento },
  boton_secundario: { backgroundColor: colores.superficie2, borderWidth: 1, borderColor: colores.borde },
  boton_peligro: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.peligro },
  boton_texto: { backgroundColor: 'transparent', minHeight: 40 },
  botonTexto: { fontSize: 16, fontWeight: '700' },
  botonTexto_principal: { color: colores.acentoTexto },
  botonTexto_secundario: { color: colores.texto },
  botonTexto_peligro: { color: colores.peligro },
  botonTexto_texto: { color: colores.textoSuave, fontWeight: '600' },

  campo: {
    backgroundColor: colores.superficie2,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio.m,
    color: colores.texto,
    fontSize: 16,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.m,
    minHeight: 48,
  },

  error: {
    borderColor: colores.peligro,
    borderWidth: 1,
    borderRadius: radio.m,
    padding: espacio.m,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },

  casilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.m,
    borderRadius: radio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie2,
  },
  casillaMarcada: { borderColor: colores.acento },
  cuadradito: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colores.textoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuadraditoMarcado: { backgroundColor: colores.acento, borderColor: colores.acento },
});
