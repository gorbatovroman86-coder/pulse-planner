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
  dayHours,
  warmedId,
  landedId,
  selectedId,
  onOpenProject,
}: {
  projects: Project[]
  tasks: Task[]
  dayHours: number
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
  const forgotten = pulses.find((p) => p.cold) ?? null
  const plannedMinutes = today.reduce((s, t) => s + t.estimate_minutes, 0)
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null)
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
      <Verdict
        cold={cold}
        untouched={untouched}
        planned={today.length}
        plannedMinutes={plannedMinutes}
        forgotten={forgotten}
        onReveal={(id) => setReveal((r) => ({ id, n: (r?.n ?? 0) + 1 }))}
      />

      <div className="grid grid-cols-1 items-start gap-5 pb-16 xl:grid-cols-[minmax(0,1fr)_364px]">
        <div className="order-2 min-w-0 xl:order-1">
          <Ledger
            pulses={pulses}
            tasks={tasks}
            dayHours={dayHours}
            warmedId={warmedId}
            revealId={reveal ? reveal.id : null}
            onOpenProject={onOpenProject}
          />
          <Inbox tasks={inbox} projects={active} />
        </div>

        <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-[74px]">
          <Today
            tasks={today}
            projects={projects}
            landedId={landedId}
            selectedId={selectedId}
            dayHours={dayHours}
          />
        </div>
      </div>
    </div>
  )
}

function Verdict({
  cold,
  untouched,
  planned,
  plannedMinutes,
  forgotten,
  onReveal,
}: {
  cold: number
  untouched: number
  planned: number
  plannedMinutes: number
  forgotten: Pulse | null
  onReveal: (id: string) => void
}) {
  const num = (v: string | number) => (
    <span className="num font-medium" style={{ fontSize: '1.05em' }}>
      {v}
    </span>
  )

  const first =
    untouched > 0 && untouched === cold ? (
      <>
        <span style={{ color: 'var(--color-alarm)' }}>{num(untouched)}</span>{' '}
        {plural(untouched, 'проект', 'проекта', 'проектов')} ещё ни разу не трогали
      </>
    ) : cold > 0 ? (
      <>
        <span style={{ color: 'var(--color-alarm)' }}>{num(cold)}</span>{' '}
        {plural(cold, 'проект остыл', 'проекта остыли', 'проектов остыли')}
      </>
    ) : (
      <>Все проекты в работе</>
    )

  return (
    <div className="py-6 sm:py-7">
      <h1 className="text-[21px] leading-[1.3] sm:text-[24px]" style={{ fontWeight: 400 }}>
        {first}
        <span className="text-ink4">, </span>
        {planned > 0 ? (
          <>сегодня запланировано {num(fmtDuration(plannedMinutes))}</>
        ) : (
          <>на сегодня ничего не запланировано</>
        )}
        <span className="text-ink4">.</span>
      </h1>

      {forgotten && (
        <p className="pt-1.5 text-[14px] text-ink2">
          Дольше всех ждёт{' '}
          <button
            onClick={() => onReveal(forgotten.project.id)}
            className="font-medium text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-ink3"
          >
            {forgotten.project.name}
          </button>
          {forgotten.daysSinceTouch === null ? (
            <> — к нему ещё не подходили</>
          ) : (
            <>
              {' '}
              — <span className="num">{forgotten.daysSinceTouch}</span>{' '}
              {plural(forgotten.daysSinceTouch, 'день', 'дня', 'дней')}
            </>
          )}
          <span className="text-ink4">.</span>
        </p>
      )}
    </div>
  )
}
