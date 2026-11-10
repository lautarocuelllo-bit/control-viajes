import { Link } from 'expo-router';
import { EnvelopeSimple, UserPlus } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Marca } from '@/components/Marca';
import { Boton, Campo, MensajeError, Pantalla, Tarjeta, Texto } from '@/components/ui';
import { mensajeDeError, supabase } from '@/lib/supabase';
import { colores, espacio, fuentes, tamIcono } from '@/lib/tema';

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisarMail, setRevisarMail] = useState(false);

  async function registrarme() {
    if (!nombre.trim()) return setError('Poné tu nombre: es el que van a ver los demás.');
    if (!email.trim()) return setError('Completá el email.');
    if (contrasena.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.');

    setEnviando(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: contrasena,
      options: { data: { nombre: nombre.trim() } },
    });
    setEnviando(false);

    if (error) return setError(mensajeDeError(error));
    // Si el proyecto pide confirmar el email, no hay sesión hasta que se confirme
    if (!data.session) setRevisarMail(true);
  }

  if (revisarMail) {
    return (
      <Pantalla>
        <Tarjeta style={{ marginTop: espacio.xxl }}>
          <EnvelopeSimple size={tamIcono.l} color={colores.acento} />
          <Texto variante="subtitulo">Revisá tu email</Texto>
          <Texto variante="suave">
            Te mandamos un link a {email.trim()}. Tocalo para confirmar tu cuenta y después ingresá.
          </Texto>
          <Link href="/ingresar" style={{ color: colores.acento, fontFamily: fuentes.semi }}>
            Ir a ingresar
          </Link>
        </Tarjeta>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <View style={{ gap: espacio.l, marginTop: espacio.xxl }}>
        <Marca tam={48} />
        <View style={{ gap: espacio.s }}>
          <Texto variante="titulo">Crear cuenta</Texto>
          <Texto variante="suave" style={{ fontSize: 16, lineHeight: 23 }}>
            Una sola vez. Después entrás desde el celular o la compu.
          </Texto>
        </View>
      </View>

      <Tarjeta>
        <Campo
          etiqueta="Tu nombre"
          value={nombre}
          onChangeText={setNombre}
          autoComplete="name"
          textContentType="name"
          placeholder="Como te conocen en el grupo"
          maxLength={40}
        />
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
          autoComplete="new-password"
          textContentType="newPassword"
          ayuda="Al menos 6 caracteres."
          onSubmitEditing={registrarme}
        />
        <MensajeError mensaje={error} />
        <Boton titulo="Crear cuenta" icono={UserPlus} alTocar={registrarme} cargando={enviando} />
      </Tarjeta>

      <Texto variante="suave" style={{ textAlign: 'center' }}>
        ¿Ya tenés cuenta?{' '}
        <Link href="/ingresar" style={{ color: colores.acento, fontFamily: fuentes.semi }}>
          Ingresá
        </Link>
      </Texto>
    </Pantalla>
  );
}
