// Lee los archivos que guardaba la app vieja (viajes.py):
//   historial.json  [{ "persona": "kevin", "accion": "viaje", "monto": 2500, "fecha": "2025-06-12 16:01:56" }]
//   deudas.json     { "kevin": 2500, "lauty": 0 }
// Los pagos del historial vienen con monto negativo.

export type Movimiento = { momento: string; monto: number };

export type PersonaViajesPy = {
  /** Nombre tal como estaba en viajes.py, con la primera letra en mayúscula */
  nombre: string;
  viajes: Movimiento[];
  pagos: Movimiento[];
  /** Solo en deudas.json: lo que debía (negativo si tenía a favor) */
  deuda: number | null;
  /** Viajes repetidos el mismo día (se carga uno solo) */
  repetidos: number;
};

export type DatosViajesPy = {
  formato: 'historial' | 'deudas';
  personas: PersonaViajesPy[];
};

const FECHA = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;

export function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function capitalizar(texto: string) {
  const limpio = texto.trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/** Lee el texto pegado. Si no es un archivo de viajes.py, tira un error con el motivo. */
export function leerViajesPy(texto: string): DatosViajesPy {
  let json: unknown;
  try {
    json = JSON.parse(texto.trim());
  } catch {
    throw new Error('No se pudo leer. Copiá el archivo completo, desde el primer [ o { hasta el último ] o }.');
  }

  if (Array.isArray(json)) return leerHistorial(json);
  if (json && typeof json === 'object') return leerDeudas(json as Record<string, unknown>);
  throw new Error('No parece un archivo de viajes.py.');
}

function leerHistorial(filas: unknown[]): DatosViajesPy {
  const personas = new Map<string, PersonaViajesPy>();
  const dias = new Set<string>();

  for (const fila of filas) {
    const f = fila as Record<string, unknown>;
    if (typeof f?.persona !== 'string' || typeof f.monto !== 'number' || typeof f.fecha !== 'string' || !FECHA.test(f.fecha)) {
      throw new Error('No parece el historial.json de viajes.py: falta la persona, el monto o la fecha en algún registro.');
    }
    if (!f.persona.trim()) continue;
    const clave = normalizar(f.persona);
    const persona = personas.get(clave) ?? { nombre: capitalizar(f.persona), viajes: [], pagos: [], deuda: null, repetidos: 0 };
    personas.set(clave, persona);

    const monto = Math.round(Math.abs(f.monto));
    if (monto === 0) continue;
    if (f.accion === 'viaje') {
      const dia = `${clave}|${f.fecha.slice(0, 10)}`;
      if (dias.has(dia)) persona.repetidos += 1;
      else {
        dias.add(dia);
        persona.viajes.push({ momento: f.fecha, monto });
      }
    } else if (f.accion === 'pago') {
      persona.pagos.push({ momento: f.fecha, monto });
    }
  }

  if (personas.size === 0) throw new Error('El historial está vacío.');
  return { formato: 'historial', personas: [...personas.values()] };
}

function leerDeudas(objeto: Record<string, unknown>): DatosViajesPy {
  const personas: PersonaViajesPy[] = [];
  for (const [nombre, monto] of Object.entries(objeto)) {
    if (typeof monto !== 'number') {
      throw new Error('No parece el deudas.json de viajes.py: cada nombre tiene que tener un número.');
    }
    if (!nombre.trim()) continue;
    personas.push({ nombre: capitalizar(nombre), viajes: [], pagos: [], deuda: Math.round(monto), repetidos: 0 });
  }
  if (personas.length === 0) throw new Error('El archivo de deudas está vacío.');
  return { formato: 'deudas', personas };
}

/** Lo que suma a la cuenta de una persona: viajes menos pagos, o la deuda */
export function totalDe(p: PersonaViajesPy) {
  if (p.deuda !== null) return p.deuda;
  return p.viajes.reduce((s, v) => s + v.monto, 0) - p.pagos.reduce((s, v) => s + v.monto, 0);
}

export function tieneAlgo(p: PersonaViajesPy) {
  return p.viajes.length > 0 || p.pagos.length > 0 || (p.deuda !== null && p.deuda !== 0);
}

/** Busca al pasajero que más se parece por nombre ("lauty" → "Lauty Cuello") */
export function adivinarPasajero(nombre: string, pasajeros: { id: string; nombre: string }[]) {
  const buscado = normalizar(nombre);
  if (!buscado) return null;
  const exacto = pasajeros.find((p) => normalizar(p.nombre) === buscado);
  if (exacto) return exacto.id;
  const parecido = pasajeros.filter((p) => {
    const primero = normalizar(p.nombre).split(/\s+/)[0];
    return primero.startsWith(buscado) || buscado.startsWith(primero);
  });
  return parecido.length === 1 ? parecido[0].id : null;
}
