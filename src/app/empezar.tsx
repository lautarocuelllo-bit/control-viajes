import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Campo, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { espacio } from '@/lib/tema';

// Primera vez: o creás el grupo (sos el que maneja) o te unís con el código
export default function Empezar() {
  const { perfil, recargar, salir } = useSesion();

  const [codigo, setCodigo] = useState('');
  const [uniendo, setUniendo] = useState(false);
  const [errorUnir, setErrorUnir] = useState<string | null>(null);

  const [nombreGrupo, setNombreGrupo] = useState('Viajes a la facu');
  const [precio, setPrecio] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  async function unirme() {
    if (!/^\d{6}$/.test(codigo.trim())) return setErrorUnir('El código tiene 6 números.');
    setUniendo(true);
    setErrorUnir(null);
    const { error } = await supabase.rpc('unirse_a_grupo', { p_codigo: codigo.trim() });
    if (error) {
      setUniendo(false);
      return setErrorUnir(mensajeDeError(error));
    }
    await recargar();
  }

  async function crear() {
    const monto = Number(precio.replace(/\D/g, ''));
    if (!nombreGrupo.trim()) return setErrorCrear('Ponele un nombre al grupo.');
    if (!monto) return setErrorCrear('Poné cuánto paga cada uno por viaje.');
    setCreando(true);
    setErrorCrear(null);
    const { error } = await supabase.rpc('crear_grupo', { p_nombre: nombreGrupo.trim(), p_precio: monto });
    if (error) {
      setCreando(false);
      return setErrorCrear(mensajeDeError(error));
    }
    await recargar();
  }

  return (
    <Pantalla>
      <View style={{ gap: espacio.s, marginTop: espacio.xl }}>
        <Texto variante="titulo">Hola{perfil ? `, ${perfil.nombre}` : ''} 👋</Texto>
        <Texto variante="suave">Para empezar, uníte al grupo de quien te lleva o creá el tuyo si sos el que maneja.</Texto>
      </View>

      <Tarjeta>
        <Texto variante="subtitulo">Me llevan</Texto>
        <Texto variante="suave">Pedile el código de 6 números al que maneja.</Texto>
        <Campo
          etiqueta="Código del grupo"
          value={codigo}
          onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
          onSubmitEditing={unirme}
        />
        <MensajeError mensaje={errorUnir} />
        <Boton titulo="Unirme" alTocar={unirme} cargando={uniendo} />
      </Tarjeta>

      <Tarjeta>
        <Texto variante="subtitulo">Yo manejo</Texto>
        <Texto variante="suave">Creás el grupo, le pasás el código a los demás y registrás quién va cada día.</Texto>
        <Campo etiqueta="Nombre del grupo" value={nombreGrupo} onChangeText={setNombreGrupo} maxLength={60} />
        <Campo
          etiqueta="Precio por viaje (por persona)"
          value={precio}
          onChangeText={(t) => setPrecio(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="2500"
          ayuda="Lo podés cambiar cuando quieras. Los viajes ya registrados mantienen su precio."
        />
        <MensajeError mensaje={errorCrear} />
        <Boton titulo="Crear grupo" tipo="secundario" alTocar={crear} cargando={creando} />
      </Tarjeta>

      <Boton titulo="Cerrar sesión" tipo="texto" alTocar={salir} />
    </Pantalla>
  );
}
