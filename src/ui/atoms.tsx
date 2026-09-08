import { STRIP_DAYS } from '../lib/derive'
import { DAY, fmtDate, fmtHours, startOfDay } from '../lib/dates'

/**
 * Пульс недели: сколько внимания вложено против бюджета.
 * Одна полоса — одно чтение. Дорожка = бюджет, заливка = факт,
 * перебор — насечка поверх полной полосы.
 */
export function Gauge({
  investedMinutes,
  budgetMinutes,
  color,
  width = 72,
}: {
  investedMinutes: number
  budgetMinutes: number
  color: string
  width?: number
}) {
  const share = budgetMinutes > 0 ? investedMinutes / budgetMinutes : 0
  const over = share > 1
  const fill = Math.min(1, share)
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-full"
      style={{ width, height: 6, backgroundColor: 'var(--color-line2)' }}
      title={`${fmtHours(investedMinutes)} из ${fmtHours(budgetMinutes)} ч за неделю`}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${fill * 100}%`, backgroundColor: color }}
      />
      {over && (
        <span
          className="absolute inset-y-0 right-0 rounded-full"
          style={{ width: 6, backgroundColor: 'var(--color-alarm)' }}
        />
      )}
    </span>
  )
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}

/** Приоритет: точка. Показывается только там, где он поднят. */
export function PriorityMark({ p }: { p: 1 | 2 | 3 }) {
  if (p === 3) return null
  return (
    <span
      className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
      style={{ backgroundColor: p === 1 ? 'var(--color-alarm)' : 'var(--color-ink4)' }}
      title={p === 1 ? 'Важно' : 'Средний приоритет'}
    />
  )
}

/**
 * Лента касаний: столбик на каждый из 21 дня, высота = закрытые часы.
 * Живёт там, где смотрят на один проект: семь таких лент подряд
 * в общем списке превращались в шум.
 */
export function Strip({
  data,
  color,
  dayMinutes,
  height = 28,
  cell = 5,
  gap = 3,
  animateLast = false,
}: {
  data: number[]
  color: string
  /** Дневная норма в минутах: полный столбик — весь день. */
  dayMinutes: number
  height?: number
  cell?: number
  gap?: number
  animateLast?: boolean
}) {
  const max = Math.max(60, dayMinutes)
  const today = startOfDay(new Date())
  return (
    <div className="flex items-end" style={{ height, gap }} title={`Закрытые часы за ${STRIP_DAYS} дней`}>
      {data.map((minutes, i) => {
        const day = new Date(today.getTime() - (data.length - 1 - i) * DAY)
        const monday = day.getDay() === 1
        const isToday = i === data.length - 1
        const over = minutes > max
        const h =
          minutes > 0 ? Math.min(height, Math.max(4, Math.round((minutes / max) * height))) : 2
        const fill =
          minutes > 0
            ? isToday
              ? color
              : `color-mix(in oklab, ${color} 55%, #fff)`
            : 'var(--color-line)'
        return (
          <div key={i} className="relative flex items-end" style={{ width: cell, height }}>
            {monday && (
              <span
                aria-hidden
                className="absolute -bottom-[5px] left-0 w-full rounded-full"
                style={{ height: 2, backgroundColor: 'var(--color-line)' }}
              />
            )}
            <span
              className={`relative rounded-t-[2px] ${isToday && animateLast && minutes > 0 ? 'tick-grow' : ''}`}
              title={
                minutes === 0
                  ? `${fmtDate(day)} — пусто`
                  : `${fmtDate(day)} — ${fmtHours(minutes)} ч${over ? ' (сверх дневной нормы)' : ''}`
              }
              style={{
                width: cell,
                height: h,
                // Зарубка-обрыв у столбика, переросшего шкалу.
                ...(over
                  ? {
                      backgroundImage: `linear-gradient(to top, ${fill} calc(100% - 7px), transparent calc(100% - 7px), transparent calc(100% - 5px), ${fill} calc(100% - 5px))`,
                    }
                  : { backgroundColor: fill }),
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Вложено против бюджета числом — там, где нужна точность. */
export function BudgetFraction({
  investedMinutes,
  budgetMinutes,
  size = 14,
  unit,
}: {
  investedMinutes: number
  budgetMinutes: number
  size?: number
  unit?: string
}) {
  const over = investedMinutes > budgetMinutes && budgetMinutes > 0
  const empty = investedMinutes === 0
  return (
    <span className="num whitespace-nowrap" style={{ fontSize: size }}>
      <span
        style={{
          color: over ? 'var(--color-alarm)' : empty ? 'var(--color-ink4)' : 'var(--color-ink)',
          fontWeight: 500,
        }}
      >
        {fmtHours(investedMinutes)}
      </span>
      <span style={{ color: 'var(--color-ink4)', fontWeight: 400 }}>
        {' / '}
        {fmtHours(budgetMinutes)}
        {unit ? ` ${unit}` : ''}
      </span>
    </span>
  )
}
