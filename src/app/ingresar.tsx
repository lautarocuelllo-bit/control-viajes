import { Link } from 'expo-router';
import { SignIn } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Anuncios } from '@/components/Anuncios';
import { Marca } from '@/components/Marca';
import { Boton, Campo, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, fuentes } from '@/lib/tema';

export default function Ingresar() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar() {
    if (!email.trim() || !contrasena) {
      setError('Completá el email y la contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: contrasena });
    setEnviando(false);
    if (error) setError(mensajeDeError(error));
    // Si sale bien, la navegación cambia sola al detectar la sesión
  }

  return (
    <Pantalla>
      <Anuncios />
      <View style={{ gap: espacio.l, marginTop: espacio.xxl }}>
        <Marca />
        <View style={{ gap: espacio.s }}>
          <Texto variante="titulo">Control de viajes</Texto>
          <Texto variante="suave" style={{ fontSize: 16, lineHeight: 23 }}>
            Quién fue, cuánto se debe y quién ya pagó, sin cuentas a mano.
          </Texto>
        </View>
      </View>

      <Tarjeta>
        <Campo
          etiqueta="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="vos@mail.com"
        />
        <Campo
          etiqueta="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          contrasena
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={ingresar}
        />
        <MensajeError mensaje={error} />
        <Boton titulo="Ingresar" icono={SignIn} alTocar={ingresar} cargando={enviando} />
      </Tarjeta>

      <Texto variante="suave" style={{ textAlign: 'center' }}>
        ¿No tenés cuenta?{' '}
        <Link href="/registro" style={{ color: colores.acento, fontFamily: fuentes.semi }}>
          Registrate
        </Link>
      </Texto>
    </Pantalla>
  );
}
