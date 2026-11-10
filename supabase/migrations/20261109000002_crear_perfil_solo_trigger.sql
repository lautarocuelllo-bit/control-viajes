-- crear_perfil solo la ejecuta el trigger al registrarse, no la app
revoke execute on function public.crear_perfil() from authenticated;
