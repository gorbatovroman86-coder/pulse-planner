import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { Pulse } from '../lib/derive'
import { fmtDate, plural } from '../lib/dates'
import { BudgetFraction, Pigment, Strip } from './atoms'
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

  const coldCount = pulses.filter((p) => p.cold).length
  let dividerDrawn = false

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <section aria-label="Проекты" className="card overflow-hidden">
      {coldCount > 0 && (
        <SectionHead
          title="Остыли"
          count={coldCount}
          hint="дольше порога без касания"
          alarm
          first
        />
      )}

      {pulses.map((p) => {
        const showDivider = !p.cold && !dividerDrawn && coldCount > 0
        if (showDivider) dividerDrawn = true
        return (
          <div key={p.project.id}>
            {showDivider && <SectionHead title="В работе" count={pulses.length - coldCount} />}
            <Row
              pulse={p}
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
      className={`flex items-center gap-2 px-5 pb-2 pt-4 ${first ? '' : 'border-t'}`}
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
        className="group flex cursor-pointer items-center gap-3.5 border-t px-5 py-3 transition-colors first:border-t-0 hover:bg-hover sm:gap-4"
        style={{ borderColor: 'var(--color-line2)' }}
        onClick={onToggle}
      >
        <Pigment color={p.color} days={days} cooldown={p.cooldown_days} height={34} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium">{p.name}</span>
            {pulse.noTasks && (
              <span
                className="shrink-0 rounded-md px-1.5 py-[1px] text-[11.5px] font-medium"
                style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
              >
                нет задач
              </span>
            )}
          </div>
          <div className="mt-[3px] flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink3">
            <span>
              {pulse.openTasks.length === 0
                ? 'нет открытых задач'
                : `${pulse.openTasks.length} ${plural(pulse.openTasks.length, 'открытая', 'открытые', 'открытых')}`}
            </span>
            {pulse.nextDue && (
              <>
                <span className="text-ink4">·</span>
                <span style={{ color: pulse.overdue ? 'var(--color-alarm)' : undefined }}>
                  ближайший <span className="num">{fmtDate(pulse.nextDue)}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-5 sm:gap-6">
          <div className="hidden sm:block" title="Закрытые часы за три недели">
            <Strip data={pulse.strip} color={p.color} animateLast={warmed} />
          </div>

          <div className="hidden w-[76px] text-right md:block" title="Вложено за неделю против бюджета">
            <BudgetFraction
              investedMinutes={pulse.investedMinutes}
              budgetMinutes={pulse.budgetMinutes}
              unit="ч"
            />
          </div>

          <div className="w-[68px] text-right" title="Дней с последнего касания">
            {days === null ? (
              <span className="text-[13px] text-ink3">ни разу</span>
            ) : days === 0 ? (
              <span className="text-[13px] text-ink3">сегодня</span>
            ) : (
              <span className="whitespace-nowrap">
                <span
                  className="num text-[16px]"
                  style={{ color: cold ? 'var(--color-alarm)' : 'var(--color-ink)', fontWeight: 500 }}
                >
                  {days}
                </span>
                <span className="pl-1 text-[12.5px] text-ink3">
                  {plural(days, 'день', 'дня', 'дней')}
                </span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          className="shrink-0 text-ink4 transition-transform hover:text-ink2"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M5 3 L9.5 7 L5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="expand" data-open={expanded} inert={!expanded} aria-hidden={!expanded}>
        <div>
          <Expanded pulse={pulse} onOpenProject={onOpenProject} />
        </div>
      </div>
    </div>
  )
}

function Expanded({ pulse, onOpenProject }: { pulse: Pulse; onOpenProject: (id: string) => void }) {
  const [draft, setDraft] = useState('')
  const p = pulse.project

  function add() {
    const title = draft.trim()
    if (!title) return
    addTask({ title, project_id: p.id, status: 'inbox' })
    setDraft('')
  }

  return (
    <div className="px-5 pb-4 pl-[38px]">
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
          style={{ backgroundColor: 'var(--color-sunken)' }}
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
