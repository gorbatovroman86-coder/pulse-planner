import { STRIP_DAYS } from '../lib/derive'
import { DAY, fmtHours, startOfDay } from '../lib/dates'

/**
 * Пигмент проекта — вертикальная шкала внимания: налита доверху у свежего,
 * осела к донышку у забытого. Цвет читается всегда.
 */
export function Pigment({
  color,
  days,
  cooldown,
  height = 30,
}: {
  color: string
  days: number | null
  cooldown: number
  height?: number
}) {
  const level =
    days === null ? 0.24 : Math.max(0.24, Math.min(1, 1 - days / Math.max(1, cooldown)))
  return (
    <span
      aria-hidden
      className="relative block w-[4px] shrink-0 overflow-hidden rounded-full"
      style={{ height, backgroundColor: `color-mix(in oklab, ${color} 30%, #fff)` }}
    >
      <span
        className="absolute bottom-0 left-0 w-full rounded-full transition-[height] duration-500"
        style={{ height: `${level * 100}%`, backgroundColor: color }}
      />
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

/** Приоритет: три засечки. Заполнено столько, насколько задача важна. */
export function PriorityMark({ p }: { p: 1 | 2 | 3 }) {
  const filled = 4 - p
  if (p === 3) return null
  return (
    <span className="inline-flex shrink-0 items-end gap-[2px]" title={`Приоритет ${p}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-[2px] rounded-full"
          style={{
            height: 4 + i * 3,
            backgroundColor: i < filled ? 'var(--color-alarm)' : 'transparent',
          }}
        />
      ))}
    </span>
  )
}

/**
 * Лента касаний — подпись проекта. Столбик на каждый из 21 дня,
 * высота = закрытые часы. Провал виден без чтения текста.
 */
export function Strip({
  data,
  color,
  height = 26,
  cell = 4,
  gap = 3,
  animateLast = false,
}: {
  data: number[]
  color: string
  height?: number
  cell?: number
  gap?: number
  animateLast?: boolean
}) {
  const max = Math.max(60, ...data)
  const today = startOfDay(new Date())
  return (
    <div className="flex items-end" style={{ height, gap }} title={`Закрытые часы за ${STRIP_DAYS} дней`}>
      {data.map((minutes, i) => {
        const day = new Date(today.getTime() - (data.length - 1 - i) * DAY)
        const monday = day.getDay() === 1
        const isToday = i === data.length - 1
        const h = minutes > 0 ? Math.max(4, Math.round((minutes / max) * height)) : 2
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
              className={`relative rounded-full ${isToday && animateLast && minutes > 0 ? 'tick-grow' : ''}`}
              style={{
                width: cell,
                height: h,
                backgroundColor:
                  minutes > 0
                    ? isToday
                      ? color
                      : `color-mix(in oklab, ${color} 55%, #fff)`
                    : 'var(--color-line)',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Вложено против бюджета: дробь, а не полоса. Перебор — другими чернилами. */
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
