import { STRIP_DAYS } from '../lib/derive'
import { DAY, fmtHours, startOfDay } from '../lib/dates'

/**
 * Пигмент проекта — столбик уровня внимания: полный у свежего,
 * осевший к донышку у остывшего. Цвет читается всегда, уровень — с одного взгляда.
 */
export function Pigment({
  color,
  days,
  cooldown,
}: {
  color: string
  days: number | null
  cooldown: number
}) {
  const level =
    days === null ? 0.22 : Math.max(0.22, Math.min(1, 1 - days / Math.max(1, cooldown)))
  return (
    <span
      aria-hidden
      className="relative block h-full w-[4px]"
      style={{ backgroundColor: `color-mix(in oklab, ${color} 34%, var(--color-paper))` }}
    >
      <span
        className="absolute bottom-0 left-0 w-full transition-[height] duration-500"
        style={{ height: `${level * 100}%`, backgroundColor: color }}
      />
    </span>
  )
}

export function Dot({ color, size = 7 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}

/** Приоритет: три засечки, заполнено столько, насколько задача важна. */
export function PriorityMark({ p }: { p: 1 | 2 | 3 }) {
  const filled = 4 - p
  return (
    <span className="inline-flex gap-[2px] align-middle" title={`Приоритет ${p}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[9px] w-[2px]"
          style={{ backgroundColor: i < filled ? 'var(--color-ink2)' : 'var(--color-rule)' }}
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
  height = 22,
  cell = 4,
  gap = 2,
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
    <div
      className="flex items-end"
      style={{ height, gap }}
      title={`Закрытые часы за ${STRIP_DAYS} дней`}
    >
      {data.map((minutes, i) => {
        const day = new Date(today.getTime() - (data.length - 1 - i) * DAY)
        const monday = day.getDay() === 1
        const isToday = i === data.length - 1
        const h = minutes > 0 ? Math.max(3, Math.round((minutes / max) * height)) : 1
        return (
          <div key={i} className="relative flex items-end" style={{ width: cell, height }}>
            {monday && (
              <span
                aria-hidden
                className="absolute -bottom-[3px] left-0 w-full"
                style={{ height: 2, backgroundColor: 'var(--color-ink4)' }}
                title="понедельник"
              />
            )}
            <span
              className={isToday && animateLast && minutes > 0 ? 'relative tick-grow' : 'relative'}
              style={{
                width: cell,
                height: h,
                backgroundColor:
                  minutes > 0
                    ? isToday
                      ? color
                      : `color-mix(in oklab, ${color} 62%, var(--color-paper))`
                    : 'var(--color-rule)',
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
}: {
  investedMinutes: number
  budgetMinutes: number
}) {
  const over = investedMinutes > budgetMinutes && budgetMinutes > 0
  const empty = investedMinutes === 0
  return (
    <span className="num text-[12.5px] whitespace-nowrap">
      <span
        style={{
          color: over ? 'var(--color-warm)' : empty ? 'var(--color-ink4)' : 'var(--color-ink)',
          fontWeight: over || !empty ? 500 : 400,
        }}
      >
        {fmtHours(investedMinutes)}
      </span>
      <span style={{ color: 'var(--color-ink4)' }}>/{fmtHours(budgetMinutes)}</span>
    </span>
  )
}

export function Rule({ className = '' }: { className?: string }) {
  return <div className={`h-px w-full bg-rule2 ${className}`} />
}
