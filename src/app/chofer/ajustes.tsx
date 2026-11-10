import { FloppyDisk, ShareNetwork, SignOut } from 'phosphor-react-native';
import { useState } from 'react';
import { Platform, Share, Text } from 'react-native';

import { Aviso, Boton, Campo, confirmar, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { plata } from '@/lib/formato';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, fuentes } from '@/lib/tema';

export default function Ajustes() {
  const { grupo, perfil, recargar, salir } = useSesion();
  const [precio, setPrecio] = useState(String(grupo?.precio_viaje ?? ''));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!grupo) return null;

  async function compartirCodigo() {
    if (!grupo) return;
    const texto = `Unite a "${grupo.nombre}" en Control de viajes con el código ${grupo.codigo}`;
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: texto });
        else {
          await navigator.clipboard.writeText(texto);
          setMensaje('Copiado. Pegalo en el grupo de WhatsApp.');
        }
      } else {
        await Share.share({ message: texto });
      }
    } catch {
      // El usuario canceló el menú de compartir: no hace falta avisar
    }
  }

  async function guardarPrecio() {
    if (!grupo) return;
    const valor = Number(precio.replace(/\D/g, ''));
    if (!valor) return setError('Poné un precio mayor a 0.');
    if (valor === grupo.precio_viaje) return;
    const ok = await confirmar(
      'Cambiar el precio',
      `Desde ahora cada viaje va a costar ${plata(valor)}. Los viajes que ya registraste mantienen su precio.`,
      'Cambiar'
    );
    if (!ok) return;
    setGuardando(true);
    setError(null);
    const { error } = await supabase.rpc('cambiar_precio', { p_grupo: grupo.id, p_precio: valor });
    setGuardando(false);
    if (error) return setError(mensajeDeError(error));
    setMensaje(`Precio actualizado a ${plata(valor)}.`);
    await recargar();
  }

  return (
    <Pantalla>
      <Tarjeta>
        <Texto variante="subtitulo">Código del grupo</Texto>
        <Texto variante="suave">Con este código se suman tus pasajeros.</Texto>
        <Text
          selectable
          style={{
            color: colores.acento,
            fontSize: 40,
            fontFamily: fuentes.extra,
            letterSpacing: 8,
            textAlign: 'center',
            paddingVertical: espacio.s,
          }}
        >
          {grupo.codigo}
        </Text>
        <Boton titulo="Compartir código" icono={ShareNetwork} tipo="secundario" alTocar={compartirCodigo} />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Precio por viaje</Texto>
        <Campo
          etiqueta="Por persona"
          value={precio}
          onChangeText={(t) => setPrecio(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          ayuda="Cuando sube la nafta, cambialo acá. No afecta a los viajes ya registrados."
        />
        {mensaje ? <Aviso texto={mensaje} /> : null}
        <MensajeError mensaje={error} />
        <Boton titulo="Guardar precio" icono={FloppyDisk} alTocar={guardarPrecio} cargando={guardando} />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="suave">Sesión iniciada como {perfil?.nombre}</Texto>
        <Boton titulo="Cerrar sesión" icono={SignOut} tipo="peligro" alTocar={salir} />
      </Tarjeta>
    </Pantalla>
  );
}
