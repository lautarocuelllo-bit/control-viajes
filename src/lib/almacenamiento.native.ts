// En Android e iOS no existe localStorage: expo-sqlite lo agrega
// para que Supabase pueda guardar la sesión en el teléfono.
import 'expo-sqlite/localStorage/install';
