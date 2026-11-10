import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Boton, Campo, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio } from '@/lib/tema';

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
      <View style={{ gap: espacio.s, marginTop: espacio.xxl }}>
        <Texto style={{ fontSize: 40 }}>🚗</Texto>
        <Texto variante="titulo">Control de viajes</Texto>
        <Texto variante="suave">Quién fue, cuánto se debe y quién ya pagó, sin cuentas a mano.</Texto>
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
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={ingresar}
        />
        <MensajeError mensaje={error} />
        <Boton titulo="Ingresar" alTocar={ingresar} cargando={enviando} />
      </Tarjeta>

      <Texto variante="suave" style={{ textAlign: 'center' }}>
        ¿No tenés cuenta?{' '}
        <Link href="/registro" style={{ color: colores.acento, fontWeight: '700' }}>
          Registrate
        </Link>
      </Texto>
    </Pantalla>
  );
}
