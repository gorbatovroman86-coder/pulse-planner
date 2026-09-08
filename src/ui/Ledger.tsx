import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { Pulse } from '../lib/derive'
import { fmtDate, plural } from '../lib/dates'
import { adviseProject } from '../lib/advisor'
import { BudgetFraction } from './atoms'
import { DeathCount, Lifeline } from './Lifeline'
import { TaskLine } from './TaskLine'
import { addTask, touchProject } from '../data/store'
import { useFlip } from './useFlip'

type Zone = 'alive' | 'edge' | 'grave' | 'new'

const ZONES: { id: Zone; emoji: string; title: string; hint: string; ink: string }[] = [
  { id: 'alive', emoji: '🟢', title: 'В работе', hint: 'сегодня закрывал задачи', ink: 'var(--color-accent)' },
  { id: 'edge', emoji: '⚠️', title: 'На грани', hint: 'ещё день — и умрёт', ink: '#B45309' },
  { id: 'grave', emoji: '💀', title: 'Кладбище', hint: 'работа встала', ink: 'var(--color-alarm)' },
  { id: 'new', emoji: '🌱', title: 'Ещё не начаты', hint: 'ни одного касания — умирать пока нечему', ink: 'var(--color-ink2)' },
]

function zoneOf(p: Pulse): Zone {
  const d = p.daysSinceTouch
  // Непочатый проект не «умер» — он ещё не жил.
  if (d === null) return 'new'
  if (d === 0) return 'alive'
  return d < p.project.cooldown_days ? 'edge' : 'grave'
}

export function Ledger({
  pulses,
  tasks,
  warmedId,
  revealId,
  onOpenProject,
}: {
  pulses: Pulse[]
  tasks: Task[]
  warmedId: string | null
  revealId: string | null
  onOpenProject: (id: string) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())

  // Порядок сверху вниз: живые, на грани, кладбище. Внутри — дольше без работы ниже.
  const ordered = [...pulses].sort((a, b) => {
    const za = ZONES.findIndex((z) => z.id === zoneOf(a))
    const zb = ZONES.findIndex((z) => z.id === zoneOf(b))
    if (za !== zb) return za - zb
    const da = a.daysSinceTouch ?? 9999
    const db = b.daysSinceTouch ?? 9999
    if (da !== db) return da - db
    return a.project.name.localeCompare(b.project.name, 'ru')
  })

  const bindRow = useFlip(ordered.map((p) => p.project.id))

  useEffect(() => {
    if (!revealId) return
    setOpen((prev) => new Set(prev).add(revealId))
    document.querySelector(`[data-project="${revealId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [revealId])

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  let shown: Zone | null = null

  return (
    <section aria-label="Проекты" className="card overflow-hidden">
      {ordered.map((p) => {
        const zone = zoneOf(p)
        const head = zone !== shown
        if (head) shown = zone
        const z = ZONES.find((x) => x.id === zone)!
        const count = ordered.filter((x) => zoneOf(x) === zone).length
        return (
          <div key={p.project.id}>
            {head && (
              <div
                className="flex items-center gap-2 px-5 pb-2 pt-4"
                style={{
                  borderTop: shown === 'alive' ? undefined : '1px solid var(--color-line2)',
                  backgroundColor: zone === 'grave' ? 'var(--color-sunken)' : undefined,
                }}
              >
                <span className="text-[14px] leading-none">{z.emoji}</span>
                <span className="text-[13px] font-medium" style={{ color: z.ink }}>
                  {z.title}
                </span>
                <span className="count">{count}</span>
                <span className="hidden text-[12.5px] text-ink4 sm:block">{z.hint}</span>
              </div>
            )}
            <Row
              pulse={p}
              zone={zone}
              tasks={tasks}
              expanded={open.has(p.project.id)}
              onToggle={() => toggle(p.project.id)}
              warmed={warmedId === p.project.id}
              bind={bindRow(p.project.id)}
              onOpenProject={onOpenProject}
            />
          </div>
        )
      })}

      {pulses.length === 0 && (
        <p className="px-5 py-8 text-[14px] text-ink3">
          Активных проектов нет. Добавь проект на экране «Проект».
        </p>
      )}
    </section>
  )
}

function statusText(p: Pulse): { text: string; ink: string } {
  const d = p.daysSinceTouch
  if (d === null) return { text: 'не начат', ink: 'var(--color-ink3)' }
  if (d === 0) return { text: 'сегодня', ink: 'var(--color-accent)' }
  if (p.daysToDeath !== null) {
    return {
      text: p.daysToDeath === 1 ? 'умрёт завтра' : `умрёт через ${p.daysToDeath} дн.`,
      ink: '#B45309',
    }
  }
  return { text: `мёртв ${d} ${plural(d, 'день', 'дня', 'дней')}`, ink: 'var(--color-alarm)' }
}

function Row({
  pulse,
  zone,
  tasks,
  expanded,
  onToggle,
  warmed,
  bind,
  onOpenProject,
}: {
  pulse: Pulse
  zone: Zone
  tasks: Task[]
  expanded: boolean
  onToggle: () => void
  warmed: boolean
  bind: (el: HTMLElement | null) => void
  onOpenProject: (id: string) => void
}) {
  const p = pulse.project
  const st = statusText(pulse)
  const grave = zone === 'grave'

  return (
    <div
      ref={bind}
      data-project={p.id}
      className={warmed ? 'warming' : ''}
      style={{
        ['--pigment' as string]: p.color,
        backgroundColor: grave ? 'var(--color-sunken)' : undefined,
      }}
    >
      <div
        className="group flex cursor-pointer items-center gap-3 border-t px-4 py-2.5 transition-colors hover:bg-hover sm:h-[54px] sm:px-5 sm:py-0"
        style={{ borderColor: 'var(--color-line2)' }}
        onClick={onToggle}
      >
        <span
          className="shrink-0 text-[16px] leading-none"
          style={{ filter: grave ? 'grayscale(0.75) opacity(0.8)' : undefined }}
        >
          {p.emoji || '•'}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="truncate text-[15px] font-medium"
              style={{ color: grave ? 'var(--color-ink2)' : 'var(--color-ink)' }}
            >
              {p.name}
            </span>
            {pulse.noTasks && (
              <span
                className="shrink-0 rounded-md px-1.5 py-[2px] text-[11.5px] font-medium"
                style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
              >
                нет задач
              </span>
            )}
          </div>
          {/* На телефоне метрики уезжают под название */}
          <div className="mt-1 flex items-center gap-2.5 sm:hidden">
            <span className="text-[12.5px]" style={{ color: st.ink }}>
              {st.text}
            </span>
            <DeathCount deaths={pulse.deaths} worked={pulse.strip.some((m) => m > 0)} />
            <span className="num text-[12.5px] text-ink3">
              {pulse.investedMinutes ? `${Math.round((pulse.investedMinutes / 60) * 10) / 10}` : '0'}/
              {Math.round((pulse.budgetMinutes / 60) * 10) / 10} ч
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 sm:block" style={{ opacity: grave ? 0.85 : 1 }}>
          <Lifeline
            strip={pulse.strip}
            deadDays={pulse.deadDays}
            color={p.color}
            animateLast={warmed}
          />
        </div>

        <span className="hidden w-[58px] shrink-0 text-right md:block" title="Смертей за три недели">
          <DeathCount deaths={pulse.deaths} worked={pulse.strip.some((m) => m > 0)} />
        </span>

        <span className="hidden w-[74px] shrink-0 text-right lg:block">
          <BudgetFraction
            investedMinutes={pulse.investedMinutes}
            budgetMinutes={pulse.budgetMinutes}
            size={13}
            unit="ч"
          />
        </span>

        <span
          className="hidden w-[112px] shrink-0 text-right text-[13px] sm:block"
          style={{ color: st.ink }}
        >
          {st.text}
        </span>

        <span
          className="shrink-0 text-ink4 transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M5 3 L9.5 7 L5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="expand" data-open={expanded} inert={!expanded} aria-hidden={!expanded}>
        <div>
          <Expanded pulse={pulse} tasks={tasks} onOpenProject={onOpenProject} />
        </div>
      </div>
    </div>
  )
}

function Expanded({
  pulse,
  tasks,
  onOpenProject,
}: {
  pulse: Pulse
  tasks: Task[]
  onOpenProject: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const p = pulse.project
  const advice = adviseProject(pulse, tasks)

  function add(title?: string) {
    const text = (title ?? draft).trim()
    if (!text) return
    addTask({ title: text, project_id: p.id, status: 'inbox' })
    setDraft('')
  }

  return (
    <div
      className="px-5 pb-4 pt-3"
      style={{ backgroundColor: 'var(--color-sunken)', boxShadow: `inset 3px 0 0 ${p.color}` }}
    >
      {p.description && <p className="pb-2 text-[13px] text-ink3">{p.description}</p>}

      <div className="flex flex-col gap-1.5 pb-3">
        {advice.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-2.5 rounded-lg bg-surface px-2.5 py-2"
            style={{ border: '1px solid var(--color-line2)' }}
          >
            <span className="pt-[1px] text-[15px] leading-none">{a.emoji}</span>
            <span className="flex-1 text-[13px] leading-relaxed text-ink2">{a.text}</span>
            {a.suggest && (
              <button
                onClick={() => add(a.suggest)}
                className="btn btn-quiet btn-sm shrink-0"
                title={`Создать задачу «${a.suggest}»`}
              >
                Добавить
              </button>
            )}
          </div>
        ))}
      </div>

      {pulse.nextDue && (
        <p className="pb-2 text-[12.5px] text-ink3">
          ближайший срок{' '}
          <span
            className="num"
            style={{ color: pulse.overdue ? 'var(--color-alarm)' : 'var(--color-ink)' }}
          >
            {fmtDate(pulse.nextDue)}
          </span>
        </p>
      )}

      {pulse.openTasks.length > 0 ? (
        <div className="-mx-2">
          {pulse.openTasks.map((t: Task) => (
            <TaskLine
              key={t.id}
              task={t}
              project={p}
              dense
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/task-id', t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            />
          ))}
        </div>
      ) : (
        <p className="pb-2 text-[13px]" style={{ color: 'var(--color-alarm)' }}>
          Открытых задач нет — проект провисает, даже если касание было недавно.
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
            e.stopPropagation()
          }}
          placeholder={`Новая задача — ${p.name}`}
          className="field h-[34px] min-w-[200px] flex-1 text-[14px] placeholder:text-ink4"
        />
        <button onClick={() => add()} className="btn btn-quiet">
          Добавить
        </button>
        <button
          onClick={() => touchProject(p.id)}
          className="btn btn-quiet"
          title="Созвон, чтение, поездка — дата обновится, часы не вырастут"
        >
          Отметить касание
        </button>
        <button onClick={() => onOpenProject(p.id)} className="btn btn-ghost">
          Весь проект
        </button>
      </div>
    </div>
  )
}
