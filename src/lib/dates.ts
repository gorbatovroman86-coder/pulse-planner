export const DAY = 86_400_000

export const WEEKDAYS_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
export const WEEKDAYS_FULL = [
  'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье',
]

/** Локальная дата в виде YYYY-MM-DD (без сдвига часового пояса). */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfDay(d: Date | string): Date {
  const x = typeof d === 'string' ? new Date(d) : new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

/** Понедельник недели, в которую попадает дата. */
export function startOfWeek(d: Date = new Date()): Date {
  const x = startOfDay(d)
  const shift = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - shift)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setDate(x.getDate() + n)
  return x
}

/** Целых суток между календарными днями. */
export function daysBetween(from: Date | string, to: Date | string = new Date()): number {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.round((b - a) / DAY)
}

/** «14.09» — основной формат дат в интерфейсе. */
export function fmtDate(d: Date | string | null): string {
  if (!d) return '—'
  const x = typeof d === 'string' ? (d.length === 10 ? parseIsoDate(d) : new Date(d)) : d
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}`
}

/** «сегодня» / «завтра» / «14.09» — для сроков. */
export function fmtDue(iso: string | null): string {
  if (!iso) return ''
  const diff = daysBetween(parseIsoDate(iso), new Date())
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'
  if (diff === -1) return 'завтра'
  return fmtDate(iso)
}

/** Часы и минуты: 260 → «4 ч 20 мин». */
export function fmtDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h && rest) return `${h} ч ${rest} мин`
  if (h) return `${h} ч`
  return `${rest} мин`
}

/** Компактно для колонок ведомости: 4,5 */
export function fmtHours(minutes: number): string {
  const h = minutes / 60
  const r = Math.round(h * 10) / 10
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',')
}

export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
