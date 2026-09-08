import { DAY, startOfDay } from '../lib/dates'

/**
 * Инфографика смертей. Столбик на день — закрытые часы.
 * Линия под ними — жизнь проекта: цвет проекта, пока жив,
 * красный отрезок там, где он был мёртв. Красные разрывы и есть смерти.
 */
export function Lifeline({
  strip,
  deadDays,
  color,
  height = 26,
  cell = 5,
  gap = 2,
  animateLast = false,
}: {
  strip: number[]
  deadDays: boolean[]
  /** Была ли работа в окне вообще: без неё «смерти» не бывает. */
  color: string
  height?: number
  cell?: number
  gap?: number
  animateLast?: boolean
}) {
  const max = Math.max(60, ...strip)
  const today = startOfDay(new Date())
  const worked = strip.some((m) => m > 0)

  return (
    <div
      className="flex flex-col"
      title="Закрытые часы по дням и периоды, когда проект был мёртв"
    >
      {/* Работа по дням */}
      <div className="flex items-end" style={{ gap, height }}>
        {strip.map((minutes, i) => {
          const isToday = i === strip.length - 1
          const h = minutes > 0 ? Math.max(4, Math.round((minutes / max) * height)) : 2
          return (
            <span
              key={i}
              className={`rounded-full ${isToday && animateLast && minutes > 0 ? 'tick-grow' : ''}`}
              style={{
                width: cell,
                height: h,
                backgroundColor:
                  minutes > 0
                    ? isToday
                      ? color
                      : `color-mix(in oklab, ${color} 55%, #fff)`
                    : 'var(--color-line2)',
              }}
            />
          )
        })}
      </div>

      {/* Линия жизни: непрерывная, красные участки — периоды смерти */}
      <div className="mt-[4px] flex overflow-hidden rounded-full" style={{ height: 4 }}>
        {strip.map((_, i) => {
          const dead = worked && deadDays[i]
          const died = dead && !deadDays[i - 1] && i > 0
          return (
            <span
              key={i}
              style={{
                width: cell + gap,
                height: '100%',
                backgroundColor: dead
                  ? died
                    ? 'var(--color-alarm)'
                    : 'color-mix(in oklab, var(--color-alarm) 34%, #fff)'
                  : worked
                    ? `color-mix(in oklab, ${color} 72%, #fff)`
                    : 'var(--color-line2)',
              }}
            />
          )
        })}
      </div>

      {/* Засечки понедельников */}
      <div className="mt-[3px] flex" style={{ gap }}>
        {strip.map((_, i) => {
          const day = new Date(today.getTime() - (strip.length - 1 - i) * DAY)
          return (
            <span
              key={i}
              style={{
                width: cell,
                height: 2,
                borderRadius: 999,
                backgroundColor: day.getDay() === 1 ? 'var(--color-ink4)' : 'transparent',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Счётчик смертей за окно ленты. */
export function DeathCount({ deaths, worked }: { deaths: number; worked: boolean }) {
  if (!worked) {
    return (
      <span className="whitespace-nowrap text-[12.5px] text-ink4" title="За три недели работы не было">
        —
      </span>
    )
  }
  if (deaths === 0) {
    return (
      <span className="whitespace-nowrap text-[12.5px]" style={{ color: 'var(--color-accent)' }} title="За три недели ни разу не умирал">
        жив
      </span>
    )
  }
  return (
    <span
      className="whitespace-nowrap text-[12.5px]"
      style={{ color: 'var(--color-alarm)' }}
      title={`Столько раз проект умирал за три недели`}
    >
      💀 <span className="num font-medium">{deaths}</span>
    </span>
  )
}
