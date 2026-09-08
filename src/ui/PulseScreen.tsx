import { useMemo, useState } from 'react'
import type { Project, Task } from '../types'
import { computePulse, inboxList, sortPulses, todayList, type Pulse } from '../lib/derive'
import { fmtDuration, plural } from '../lib/dates'
import { Ledger } from './Ledger'
import { Today } from './Today'
import { Inbox } from './Inbox'

export function PulseScreen({
  projects,
  tasks,
  warmedId,
  landedId,
  selectedId,
  onOpenProject,
}: {
  projects: Project[]
  tasks: Task[]
  warmedId: string | null
  landedId: string | null
  selectedId: string | null
  onOpenProject: (id: string) => void
}) {
  const active = projects.filter((p) => !p.deleted_at && p.status === 'active')
  const pulses = useMemo(
    () => sortPulses(active.map((p) => computePulse(p, tasks))),
    [active, tasks],
  )
  const today = todayList(tasks)
  const inbox = inboxList(tasks)

  const cold = pulses.filter((p) => p.cold).length
  const untouched = pulses.filter((p) => p.lastTouch === null).length
  // Самый забытый проект — тот, что дольше всех без касания.
  const forgotten = pulses.find((p) => p.cold) ?? null
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null)
  const noTasks = pulses.filter((p) => p.noTasks).length
  const plannedMinutes = today.reduce((s, t) => s + t.estimate_minutes, 0)

  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6">
      <Verdict
        cold={cold}
        untouched={untouched}
        noTasks={noTasks}
        plannedMinutes={plannedMinutes}
        planned={today.length}
        forgotten={forgotten}
        onReveal={(id) => setReveal((r) => ({ id, n: (r?.n ?? 0) + 1 }))}
      />

      <div className="grid grid-cols-1 items-start gap-7 pb-16 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 min-w-0 xl:order-1">
          <Ledger
            pulses={pulses}
            warmedId={warmedId}
            revealId={reveal ? `${reveal.id}` : null}
            onOpenProject={onOpenProject}
          />
          <Inbox tasks={inbox} projects={active} />
        </div>

        <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-[62px]">
          <Today tasks={today} projects={projects} landedId={landedId} selectedId={selectedId} />
        </div>
      </div>
    </div>
  )
}

function Verdict({
  cold,
  untouched,
  noTasks,
  planned,
  plannedMinutes,
  forgotten,
  onReveal,
}: {
  cold: number
  untouched: number
  noTasks: number
  planned: number
  plannedMinutes: number
  forgotten: Pulse | null
  onReveal: (id: string) => void
}) {
  const parts: React.ReactNode[] = []

  if (untouched > 0 && untouched === cold) {
    parts.push(
      <span key="cold">
        <b className="num text-[21px] font-medium" style={{ color: 'var(--color-warm)' }}>{untouched}</b>{' '}
        {plural(untouched, 'проект', 'проекта', 'проектов')} ещё ни разу не трогали
      </span>,
    )
  } else if (cold > 0) {
    parts.push(
      <span key="cold">
        <b className="num text-[21px] font-medium" style={{ color: 'var(--color-warm)' }}>{cold}</b>{' '}
        {plural(cold, 'проект остыл', 'проекта остыли', 'проектов остыли')}
      </span>,
    )
  } else {
    parts.push(<span key="cold">все проекты в работе</span>)
  }

  if (noTasks > 0) {
    parts.push(
      <span key="nt">
        у <b className="num text-[21px] font-medium">{noTasks}</b>{' '}
        {plural(noTasks, 'нет открытых задач', 'нет открытых задач', 'нет открытых задач')}
      </span>,
    )
  }

  parts.push(
    planned > 0 ? (
      <span key="plan">
        сегодня запланировано{' '}
        <b className="num text-[21px] font-medium">{fmtDuration(plannedMinutes)}</b>
      </span>
    ) : (
      <span key="plan">на сегодня ничего не запланировано</span>
    ),
  )

  return (
    <div className="py-[18px]">
      <p className="text-[17px] leading-[1.35] sm:text-[19px]" style={{ fontWeight: 300 }}>
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: 'var(--color-ink4)' }}>, </span>}
            {p}
          </span>
        ))}
        <span style={{ color: 'var(--color-ink4)' }}>.</span>
      </p>

      {forgotten && (
        <p className="pt-1 text-[13.5px] text-ink2">
          Дольше всех ждёт{' '}
          <button
            onClick={() => onReveal(forgotten.project.id)}
            className="underline decoration-rule underline-offset-4 hover:decoration-ink"
            style={{ color: 'var(--color-ink)' }}
          >
            «{forgotten.project.name}»
          </button>{' '}
          {forgotten.daysSinceTouch === null ? (
            <span>— к нему ещё не подходили</span>
          ) : (
            <span>
              — <span className="num">{forgotten.daysSinceTouch}</span>{' '}
              {plural(forgotten.daysSinceTouch, 'день', 'дня', 'дней')}
            </span>
          )}
          <span style={{ color: 'var(--color-ink4)' }}>.</span>
        </p>
      )}
    </div>
  )
}
