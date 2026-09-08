import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { Pulse } from '../lib/derive'
import { fmtDate, plural } from '../lib/dates'
import { BudgetFraction, Pigment, Strip } from './atoms'
import { TaskLine } from './TaskLine'
import { addTask, touchProject } from '../data/store'
import { useFlip } from './useFlip'

const COLS =
  'grid-cols-[4px_minmax(120px,1fr)_44px_56px_84px_136px_82px_24px] gap-x-2 lg:gap-x-3'

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

  // Строка-вывод показала на проект — раскрываем его и подводим к нему экран.
  useEffect(() => {
    if (!revealId) return
    setOpen((prev) => new Set(prev).add(revealId))
    const el = document.querySelector(`[data-project="${revealId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [revealId])
  const bindRow = useFlip(pulses.map((p) => p.project.id))

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
    <section aria-label="Ведомость проектов">
      <div className={`hidden md:grid ${COLS} items-end pb-1.5 px-2`}>
        <span />
        <span className="eyebrow">проект</span>
        <span className="eyebrow text-right">откр.</span>
        <span className="eyebrow text-right">срок</span>
        <span className="eyebrow text-right">вложено / бюджет, ч</span>
        <span className="eyebrow">три недели</span>
        <span className="eyebrow text-right">без касания</span>
        <span />
      </div>
      <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />

      {coldCount > 0 && (
        <div className="flex items-center gap-3 pt-2 pb-1 px-2">
          <span className="eyebrow" style={{ color: 'var(--color-warm)' }}>
            остыли — {coldCount}
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-rule)' }} />
          <span className="hidden text-[12px] text-ink3 sm:block">дольше порога без касания</span>
        </div>
      )}

      {pulses.map((p) => {
        const showDivider = !p.cold && !dividerDrawn && coldCount > 0
        if (showDivider) dividerDrawn = true
        return (
          <div key={p.project.id}>
            {showDivider && (
              <div className="flex items-center gap-3 pt-3 pb-1 px-2">
                <span className="eyebrow">в работе</span>
                <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-rule)' }} />
              </div>
            )}
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
        <p className="px-2 py-6 text-[13px] text-ink3">
          Активных проектов нет. Добавь проект на экране «Проект».
        </p>
      )}
    </section>
  )
}

function DaysSince({ days, cold, big }: { days: number | null; cold: boolean; big?: boolean }) {
  if (days === null) return <span className="num text-[12px] text-ink3">ни разу</span>
  if (days === 0) return <span className="num text-[12px] text-ink3">сегодня</span>
  return (
    <>
      <span
        className={`num ${big ? 'text-[17px]' : 'text-[13px]'}`}
        style={{ color: cold ? 'var(--color-warm)' : 'var(--color-ink2)', fontWeight: cold ? 500 : 400 }}
      >
        {days}
      </span>
      <span className="eyebrow ml-1">{plural(days, 'день', 'дня', 'дней')}</span>
    </>
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
  const cold = pulse.cold
  const days = pulse.daysSinceTouch

  const name = (
    <>
      <span
        className="truncate text-[14px]"
        style={{ fontWeight: cold ? 500 : 400, color: 'var(--color-ink)' }}
      >
        {p.name}
      </span>
      {pulse.noTasks && (
        <span
          className="eyebrow shrink-0 border px-1"
          style={{ borderColor: 'var(--color-warm)', color: 'var(--color-warm)' }}
        >
          нет задач
        </span>
      )}
    </>
  )

  const chevron = (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      aria-hidden
      style={{
        transform: expanded ? 'rotate(90deg)' : 'none',
        transition: 'transform 220ms var(--ease-out-soft)',
      }}
    >
      <path d="M4 2 L8.5 6 L4 10" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )

  return (
    <div
      ref={bind}
      data-project={p.id}
      className={`border-b ${warmed ? 'warming' : ''}`}
      style={{
        borderColor: 'var(--color-rule2)',
        backgroundColor: cold ? 'transparent' : 'var(--color-card)',
        ['--pigment' as string]: p.color,
      }}
    >
      {/* Широкий экран — ведомость с выровненными колонками */}
      <div className={`hidden md:grid ${COLS} items-center px-2 h-[42px]`}>
        <div className="h-[26px]">
          <Pigment color={p.color} days={days} cooldown={p.cooldown_days} />
        </div>

        <button onClick={onToggle} className="flex min-w-0 items-baseline gap-2 text-left" aria-expanded={expanded}>
          {name}
        </button>

        <span
          className="num text-right text-[12.5px]"
          style={{ color: pulse.openTasks.length ? 'var(--color-ink)' : 'var(--color-ink4)' }}
        >
          {pulse.openTasks.length}
        </span>

        <span
          className="num text-right text-[12px]"
          style={{ color: pulse.overdue ? 'var(--color-warm)' : 'var(--color-ink3)' }}
        >
          {pulse.nextDue ? fmtDate(pulse.nextDue) : '—'}
        </span>

        <span className="text-right">
          <BudgetFraction investedMinutes={pulse.investedMinutes} budgetMinutes={pulse.budgetMinutes} />
        </span>

        <Strip data={pulse.strip} color={p.color} animateLast={warmed} />

        <span className="text-right whitespace-nowrap">
          <DaysSince days={days} cold={cold} big />
        </span>

        <button
          onClick={onToggle}
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          className="justify-self-end text-ink3 hover:text-ink"
        >
          {chevron}
        </button>
      </div>

      {/* Телефон — две строки: имя сверху, показатели снизу */}
      <div className="flex gap-2.5 px-2 py-2 md:hidden">
        <div className="w-[4px] shrink-0 self-stretch">
          <Pigment color={p.color} days={days} cooldown={p.cooldown_days} />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={onToggle}
            className="flex w-full min-w-0 items-baseline gap-2 text-left"
            aria-expanded={expanded}
          >
            {name}
          </button>
          <div className="mt-1 flex items-center gap-x-3 gap-y-1 flex-wrap">
            <span className="num text-[11.5px] text-ink2">
              {pulse.openTasks.length} откр.
            </span>
            {pulse.nextDue && (
              <span
                className="num text-[11.5px]"
                style={{ color: pulse.overdue ? 'var(--color-warm)' : 'var(--color-ink3)' }}
              >
                срок {fmtDate(pulse.nextDue)}
              </span>
            )}
            <BudgetFraction investedMinutes={pulse.investedMinutes} budgetMinutes={pulse.budgetMinutes} />
            <span className="whitespace-nowrap">
              <DaysSince days={days} cold={cold} />
            </span>
          </div>
          <div className="mt-1.5">
            <Strip data={pulse.strip} color={p.color} animateLast={warmed} height={16} cell={3} gap={2} />
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          className="self-start pt-1 text-ink3"
        >
          {chevron}
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
    <div className="pl-4 pr-2 pb-3 pt-1 sm:pl-5">
      {p.description && <p className="mb-2 text-[12.5px] text-ink2">{p.description}</p>}

      {pulse.openTasks.length > 0 ? (
        <div className="border-l pl-3" style={{ borderColor: 'var(--color-rule)' }}>
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
        <p className="mb-2 text-[12.5px] text-warm">
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
          className="h-[28px] min-w-[180px] flex-1 border border-rule bg-paper px-2 text-[13px] outline-none placeholder:text-ink4"
        />
        <button onClick={add} className="eyebrow border border-rule px-2 h-[28px] hover:bg-paper2">
          добавить
        </button>
        <button
          onClick={() => touchProject(p.id)}
          className="eyebrow border border-rule px-2 h-[28px] hover:bg-paper2"
          title="Созвон, чтение, поездка — дата обновится, часы не вырастут"
        >
          отметить касание
        </button>
        <button
          onClick={() => onOpenProject(p.id)}
          className="eyebrow px-1 h-[28px] underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          весь проект
        </button>
      </div>
    </div>
  )
}
