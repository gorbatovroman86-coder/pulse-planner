import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { Pulse } from '../lib/derive'
import { fmtDate, fmtHours, plural } from '../lib/dates'
import { BudgetFraction, Gauge, Strip } from './atoms'
import { TaskLine } from './TaskLine'
import { addTask, touchProject } from '../data/store'
import { useFlip } from './useFlip'

export function Ledger({
  pulses,
  warmedId,
  revealId,
  onOpenProject,
}: {
  pulses: Pulse[]
  warmedId: string | null
  revealId: string | null
  onOpenProject: (id: string) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const bindRow = useFlip(pulses.map((p) => p.project.id))

  useEffect(() => {
    if (!revealId) return
    setOpen((prev) => new Set(prev).add(revealId))
    document.querySelector(`[data-project="${revealId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [revealId])

  const cold = pulses.filter((p) => p.cold)
  const warm = pulses.filter((p) => !p.cold)

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const row = (p: Pulse) => (
    <Row
      key={p.project.id}
      pulse={p}
      expanded={open.has(p.project.id)}
      onToggle={() => toggle(p.project.id)}
      warmed={warmedId === p.project.id}
      bind={bindRow(p.project.id)}
      onOpenProject={onOpenProject}
    />
  )

  return (
    <section aria-label="Проекты" className="card overflow-hidden">
      {cold.length > 0 && (
        <>
          <SectionHead title="Остыли" count={cold.length} hint="давно без касания" alarm first />
          {cold.map(row)}
        </>
      )}
      {warm.length > 0 && (
        <>
          <SectionHead title="В работе" count={warm.length} first={cold.length === 0} />
          {warm.map(row)}
        </>
      )}

      {pulses.length === 0 && (
        <p className="px-5 py-8 text-[14px] text-ink3">
          Активных проектов нет. Добавь проект на экране «Проект».
        </p>
      )}
    </section>
  )
}

function SectionHead({
  title,
  count,
  hint,
  alarm,
  first,
}: {
  title: string
  count: number
  hint?: string
  alarm?: boolean
  first?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-5 pb-2 pt-4 ${first ? '' : 'mt-1 border-t'}`}
      style={{ borderColor: 'var(--color-line2)' }}
    >
      <span
        className="text-[13px] font-medium"
        style={{ color: alarm ? 'var(--color-alarm)' : 'var(--color-ink2)' }}
      >
        {title}
      </span>
      <span className="count">{count}</span>
      {hint && <span className="hidden pl-1 text-[12.5px] text-ink4 sm:block">{hint}</span>}
    </div>
  )
}

function Row({
  pulse,
  expanded,
  onToggle,
  warmed,
  bind,
  onOpenProject,
}: {
  pulse: Pulse
  expanded: boolean
  onToggle: () => void
  warmed: boolean
  bind: (el: HTMLElement | null) => void
  onOpenProject: (id: string) => void
}) {
  const p = pulse.project
  const days = pulse.daysSinceTouch
  const cold = pulse.cold

  return (
    <div
      ref={bind}
      data-project={p.id}
      className={warmed ? 'warming' : ''}
      style={{ ['--pigment' as string]: p.color }}
    >
      <div
        className="group flex cursor-pointer items-center gap-3 border-t px-4 py-2.5 transition-colors hover:bg-hover sm:h-[52px] sm:px-5 sm:py-0"
        style={{ borderColor: 'var(--color-line2)' }}
        onClick={onToggle}
      >
        <span
          className="h-[10px] w-[10px] shrink-0 rounded-full"
          style={{ backgroundColor: p.color }}
          aria-hidden
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium">{p.name}</div>
          {/* На телефоне метрики уезжают под название, иначе имя схлопывается */}
          <div className="mt-0.5 flex items-center gap-2 sm:hidden">
            {pulse.noTasks && (
              <span
                className="shrink-0 rounded-md px-1.5 py-[1px] text-[11.5px] font-medium"
                style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
              >
                нет задач
              </span>
            )}
            <span className="num text-[12.5px] text-ink3">
              {pulse.investedMinutes
                ? `${fmtHours(pulse.investedMinutes)}/${fmtHours(pulse.budgetMinutes)} ч`
                : `0/${fmtHours(pulse.budgetMinutes)} ч`}
            </span>
            <span className="text-[12.5px]" style={{ color: cold ? 'var(--color-alarm)' : 'var(--color-ink3)' }}>
              {days === null ? 'ни разу' : days === 0 ? 'сегодня' : `${days} ${plural(days, 'день', 'дня', 'дней')}`}
            </span>
          </div>
        </div>

        {pulse.noTasks && (
          <span
            className="hidden shrink-0 rounded-md px-1.5 py-[2px] text-[11.5px] font-medium sm:block"
            style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
          >
            нет задач
          </span>
        )}

        <span
          className="num hidden w-[54px] shrink-0 text-right text-[12.5px] md:block"
          style={{ color: pulse.investedMinutes ? 'var(--color-ink2)' : 'var(--color-ink4)' }}
          title="Вложено за неделю против бюджета"
        >
          {pulse.investedMinutes ? `${fmtHours(pulse.investedMinutes)}/${fmtHours(pulse.budgetMinutes)}` : '—'}
        </span>

        <span className="hidden sm:block">
          <Gauge
            investedMinutes={pulse.investedMinutes}
            budgetMinutes={pulse.budgetMinutes}
            color={p.color}
          />
        </span>

        <span
          className="hidden w-[86px] shrink-0 text-right text-[13.5px] sm:block"
          title="С последнего касания"
        >
          {days === null ? (
            <span className="text-ink3">ни разу</span>
          ) : days === 0 ? (
            <span className="text-ink2">сегодня</span>
          ) : (
            <span style={{ color: cold ? 'var(--color-alarm)' : 'var(--color-ink2)' }}>
              <span className="num font-medium">{days}</span> {plural(days, 'день', 'дня', 'дней')}
            </span>
          )}
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
          <Expanded pulse={pulse} onOpenProject={onOpenProject} warmed={warmed} />
        </div>
      </div>
    </div>
  )
}

function Expanded({
  pulse,
  onOpenProject,
  warmed,
}: {
  pulse: Pulse
  onOpenProject: (id: string) => void
  warmed: boolean
}) {
  const [draft, setDraft] = useState('')
  const p = pulse.project

  function add() {
    const title = draft.trim()
    if (!title) return
    addTask({ title, project_id: p.id, status: 'inbox' })
    setDraft('')
  }

  return (
    <div
      className="px-5 pb-4 pt-3"
      style={{
        backgroundColor: 'var(--color-sunken)',
        boxShadow: `inset 3px 0 0 ${p.color}`,
      }}
    >
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 pb-3">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] text-ink3">за неделю</span>
          <BudgetFraction
            investedMinutes={pulse.investedMinutes}
            budgetMinutes={pulse.budgetMinutes}
            size={13.5}
            unit="ч"
          />
        </span>
        <span className="flex items-center gap-2" title="Закрытые часы за три недели">
          <span className="text-[12.5px] text-ink3">три недели</span>
          <Strip data={pulse.strip} color={p.color} height={22} cell={4} gap={2} animateLast={warmed} />
        </span>
        {pulse.nextDue && (
          <span className="flex items-baseline gap-1.5 text-[12.5px]">
            <span className="text-ink3">ближайший срок</span>
            <span
              className="num text-[13.5px]"
              style={{ color: pulse.overdue ? 'var(--color-alarm)' : 'var(--color-ink)' }}
            >
              {fmtDate(pulse.nextDue)}
            </span>
          </span>
        )}
      </div>

      {p.description && <p className="pb-2 text-[13px] text-ink3">{p.description}</p>}

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
        <button onClick={add} className="btn btn-quiet">
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
