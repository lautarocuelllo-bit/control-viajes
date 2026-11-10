import { router } from 'expo-router';
import { DownloadSimple, FolderOpen, Info, WarningCircle } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Aviso, Boton, Campo, Cargando, confirmar, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { fechaCorta, fechaISO, plata } from '@/lib/formato';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, fuentes, radio } from '@/lib/tema';
import { useDatosGrupo } from '@/lib/useDatosGrupo';
import { adivinarPasajero, leerViajesPy, normalizar, tieneAlgo, totalDe, type PersonaViajesPy } from '@/lib/viajesPy';

const NO_CARGAR = '';

export default function Importar() {
  const { grupo, recargar: recargarSesion } = useSesion();
  const datos = useDatosGrupo(grupo?.id, recargarSesion);

  const [texto, setTexto] = useState('');
  const [asignacion, setAsignacion] = useState<Record<string, string>>({});
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const lectura = useMemo(() => {
    if (!texto.trim()) return { archivo: null, error: null };
    try {
      return { archivo: leerViajesPy(texto), error: null };
    } catch (e) {
      return { archivo: null, error: (e as Error).message };
    }
  }, [texto]);
  const archivo = lectura.archivo;

  // Cada vez que cambia el archivo, se emparejan solos los nombres que coinciden
  const claveArchivo = archivo?.personas.map((p) => p.nombre).join('|') ?? '';
  const clavePasajeros = datos.pasajeros.map((p) => p.id).join('|');
  useEffect(() => {
    if (!archivo) return;
    setAsignacion(
      Object.fromEntries(
        archivo.personas.map((p) => [normalizar(p.nombre), adivinarPasajero(p.nombre, datos.pasajeros) ?? NO_CARGAR])
      )
    );
    setResultado(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveArchivo, clavePasajeros]);

  if (!grupo) return null;
  if (datos.cargando) return <Cargando />;

  const elegidas = (archivo?.personas ?? []).filter((p) => asignacion[normalizar(p.nombre)] && tieneAlgo(p));
  const repetidos = (archivo?.personas ?? []).reduce((s, p) => s + p.repetidos, 0);
  const nombreDe = (id: string) => datos.pasajeros.find((p) => p.id === id)?.nombre ?? '';

  function elegirArchivo() {
    // Solo en la web: en el celular se pega el texto
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const elegido = input.files?.[0];
      if (elegido) setTexto(await elegido.text());
    };
    input.click();
  }

  async function importar() {
    if (!grupo || !archivo) return;
    const pasajeroDe = (p: PersonaViajesPy) => asignacion[normalizar(p.nombre)];
    const paquete = {
      viajes: elegidas.flatMap((p) => p.viajes.map((v) => ({ pasajero: pasajeroDe(p), momento: v.momento, monto: v.monto }))),
      pagos: elegidas.flatMap((p) => p.pagos.map((v) => ({ pasajero: pasajeroDe(p), momento: v.momento, monto: v.monto }))),
      deudas: elegidas
        .filter((p) => p.deuda)
        .map((p) => ({ pasajero: pasajeroDe(p), monto: p.deuda })),
    };

    const resumen = elegidas
      .map((p) => `${nombreDe(pasajeroDe(p))}: ${describirTotal(totalDe(p))}`)
      .join('\n');
    const ok = await confirmar(
      'Importar de viajes.py',
      `Se va a sumar a lo que ya tiene cada uno:\n\n${resumen}\n\nSi te equivocás, podés anular cada movimiento desde el detalle del pasajero.`,
      'Importar'
    );
    if (!ok) return;

    setImportando(true);
    setError(null);
    const { data, error } = await supabase.rpc('importar_viajes_py', { p_grupo: grupo.id, p_datos: paquete });
    setImportando(false);
    if (error) return setError(mensajeDeError(error));

    const r = data as { viajes: number; pagos: number; deudas: number; repetidos: number };
    const partes = [
      r.viajes ? `${r.viajes} ${r.viajes === 1 ? 'viaje' : 'viajes'}` : null,
      r.pagos ? `${r.pagos} ${r.pagos === 1 ? 'pago' : 'pagos'}` : null,
      r.deudas ? `${r.deudas} ${r.deudas === 1 ? 'deuda anterior' : 'deudas anteriores'}` : null,
    ].filter(Boolean);
    const saltados = r.repetidos ? ` Se saltearon ${r.repetidos} viajes porque ya había uno ese día.` : '';
    setResultado(`Listo, se cargaron ${partes.join(', ')}.${saltados}`);
    setTexto('');
    datos.recargar();
    recargarSesion();
  }

  return (
    <Pantalla>
      {resultado ? (
        <View style={{ gap: espacio.s }}>
          <Aviso texto={resultado} />
          <Boton titulo="Volver al panel" alTocar={() => router.back()} />
        </View>
      ) : null}

      <Tarjeta>
        <Texto variante="subtitulo">Traé las cuentas de viajes.py</Texto>
        <Texto variante="suave">
          En la compu donde usabas viajes.py, abrí la carpeta del programa. Ahí está{' '}
          <Text style={estilos.archivo}>historial.json</Text>, con cada viaje y pago. Abrilo con el Bloc de notas,
          copiá todo y pegalo acá.
        </Texto>
        <Texto variante="suave">
          Si el historial está incompleto, usá <Text style={estilos.archivo}>deudas.json</Text>: se carga solo cuánto
          debe cada uno. Usá uno de los dos, no los dos.
        </Texto>
        {Platform.OS === 'web' ? (
          <Boton titulo="Elegir archivo" icono={FolderOpen} tipo="secundario" alTocar={elegirArchivo} />
        ) : null}
        <Campo
          etiqueta="Contenido del archivo"
          value={texto}
          onChangeText={setTexto}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={'[\n  { "persona": "kevin", "accion": "viaje", ... }\n]'}
          style={estilos.campoJson}
        />
        <MensajeError mensaje={lectura.error} />
      </Tarjeta>

      {archivo ? (
        <Tarjeta>
          <Texto variante="subtitulo">¿Quién es quién?</Texto>
          <Texto variante="suave">
            {archivo.formato === 'historial'
              ? 'Elegí a qué pasajero del grupo corresponde cada nombre del historial.'
              : 'Elegí a qué pasajero del grupo corresponde cada nombre. Se carga como deuda anterior.'}
          </Texto>

          {datos.pasajeros.length === 0 ? (
            <Aviso
              icono={Info}
              tono="suave"
              texto="Todavía no se unió nadie al grupo. Pasales el código desde Ajustes y volvé cuando estén todos."
            />
          ) : null}

          {archivo.personas.map((p) => {
            const clave = normalizar(p.nombre);
            const elegido = asignacion[clave] ?? NO_CARGAR;
            return (
              <View key={clave} style={estilos.persona}>
                <View style={{ gap: 2 }}>
                  <Texto variante="fuerte">{p.nombre}</Texto>
                  <Texto variante="suave">{resumirPersona(p)}</Texto>
                </View>
                {tieneAlgo(p) ? (
                  <View style={estilos.opciones}>
                    {datos.pasajeros.map((pasajero) => (
                      <Opcion
                        key={pasajero.id}
                        texto={pasajero.nombre}
                        elegida={elegido === pasajero.id}
                        alTocar={() => setAsignacion((a) => ({ ...a, [clave]: pasajero.id }))}
                      />
                    ))}
                    <Opcion
                      texto="No cargar"
                      elegida={elegido === NO_CARGAR}
                      alTocar={() => setAsignacion((a) => ({ ...a, [clave]: NO_CARGAR }))}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          {datos.pasajeros.length > 0 ? (
            <Texto variante="suave">¿Falta alguien? Pasale el código del grupo y volvé cuando se haya unido.</Texto>
          ) : null}
          {repetidos > 0 ? (
            <Aviso
              icono={WarningCircle}
              tono="suave"
              texto={`Hay ${repetidos} ${repetidos === 1 ? 'viaje repetido' : 'viajes repetidos'} el mismo día. Se carga uno solo por día.`}
            />
          ) : null}
          {grupo.importado_at ? (
            <Aviso
              icono={WarningCircle}
              tono="suave"
              texto={`Ya importaste datos ${cuandoFue(grupo.importado_at)}. Si cargás el mismo archivo otra vez, se suma dos veces.`}
            />
          ) : null}
          <MensajeError mensaje={error} />
          <Boton
            titulo={
              elegidas.length > 0
                ? `Importar ${elegidas.length} ${elegidas.length === 1 ? 'persona' : 'personas'}`
                : 'Elegí al menos a una persona'
            }
            icono={DownloadSimple}
            alTocar={importar}
            cargando={importando}
            deshabilitado={elegidas.length === 0}
          />
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}

function cuandoFue(momento: string) {
  const dia = fechaCorta(fechaISO(new Date(momento))).toLowerCase();
  return dia === 'hoy' || dia === 'ayer' ? dia : `el ${dia}`;
}

function describirTotal(total: number) {
  if (total > 0) return `debe ${plata(total)}`;
  if (total < 0) return `tiene ${plata(-total)} a favor`;
  return 'al día';
}

function resumirPersona(p: PersonaViajesPy) {
  if (p.deuda !== null) return describirTotal(p.deuda).replace(/^./, (c) => c.toUpperCase());
  const partes = [
    `${p.viajes.length} ${p.viajes.length === 1 ? 'viaje' : 'viajes'}`,
    p.pagos.length ? `${p.pagos.length} ${p.pagos.length === 1 ? 'pago' : 'pagos'}` : null,
  ].filter(Boolean);
  return `${partes.join(', ')} · ${describirTotal(totalDe(p))}`;
}

function Opcion({ texto, elegida, alTocar }: { texto: string; elegida: boolean; alTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida }}
      onPress={alTocar}
      style={({ pressed }) => [estilos.opcion, elegida && estilos.opcionElegida, pressed && { opacity: 0.8 }]}
    >
      <Text style={[estilos.opcionTexto, elegida && { color: colores.acentoTexto }]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  archivo: { fontFamily: fuentes.semi, color: colores.texto },
  campoJson: { minHeight: 140, textAlignVertical: 'top', fontSize: 14, paddingTop: espacio.m },
  persona: { gap: espacio.s, paddingTop: espacio.m, borderTopWidth: 1, borderTopColor: colores.borde },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  opcion: {
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    borderRadius: radio.pill,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie2,
  },
  opcionElegida: { backgroundColor: colores.acento, borderColor: colores.acento },
  opcionTexto: { color: colores.texto, fontFamily: fuentes.medio, fontSize: 14 },
});
