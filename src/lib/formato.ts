// Formateos sin Intl, para que den igual en Android, iOS y web.

/** 12500 -> "$ 12.500" */
export function plata(monto: number): string {
  const signo = monto < 0 ? '−' : '';
  const entero = Math.abs(Math.round(monto))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$ ${entero}`;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha local en formato de la base: "2026-11-09" */
export function fechaISO(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

/** "2026-11-09" -> Date a las 00:00 locales (sin corrimiento de zona horaria) */
export function desdeISO(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(fecha: Date, dias: number): Date {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

/** "Hoy", "Ayer" o "lunes 3 nov" */
export function fechaCorta(iso: string): string {
  const fecha = desdeISO(iso);
  const hoy = desdeISO(fechaISO(new Date()));
  const diferencia = Math.round((hoy.getTime() - fecha.getTime()) / 86_400_000);
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Ayer';
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
}
