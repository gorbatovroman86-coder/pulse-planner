import type { Project, Task } from '../types'
import { dueOnDay, overdueTasks, weekByProject } from '../lib/derive'
import { WEEKDAYS_SHORT, addDays, fmtDate, fmtHours, isoDate, startOfDay, startOfWeek } from '../lib/dates'
import { TaskLine } from './TaskLine'

export function WeekScreen({
  projects,
  tasks,
  weekOffset,
  onShift,
}: {
  projects: Project[]
  tasks: Task[]
  weekOffset: number
  onShift: (n: number) => void
}) {
  const base = startOfWeek(new Date())
  const weekStart = addDays(base, weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayIso = isoDate(startOfDay(new Date()))
  const byProject = weekByProject(projects, tasks, weekStart)
  // Ось общая: факт и бюджет любого проекта меряются одной линейкой,
  // иначе единственный закрытый час выглядит как полная загрузка.
  const maxMinutes = Math.max(
    60,
    ...byProject.map((r) => r.minutes),
    ...byProject.map((r) => r.project.weekly_budget_hours * 60),
  )
  const totalMinutes = byProject.reduce((s, r) => s + r.minutes, 0)
  const late = weekOffset === 0 ? overdueTasks(tasks) : []
  const projectById = new Map(projects.map((p) => [p.id, p]))

  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 pt-4 sm:px-6">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-3">
        <h2 className="text-[19px]" style={{ fontWeight: 300 }}>
          Неделя <span className="num">{fmtDate(weekStart)}</span>
          <span className="text-ink4"> — </span>
          <span className="num">{fmtDate(addDays(weekStart, 6))}</span>
        </h2>
        <div className="flex gap-1">
          <button onClick={() => onShift(-1)} className="eyebrow border border-rule px-2 py-1 hover:bg-card">
            ← пред.
          </button>
          <button onClick={() => onShift(0)} className="eyebrow border border-rule px-2 py-1 hover:bg-card">
            текущая
          </button>
          <button onClick={() => onShift(1)} className="eyebrow border border-rule px-2 py-1 hover:bg-card">
            след. →
          </button>
        </div>
      </header>

      {late.length > 0 && (
        <section className="mb-4 border px-3 py-2" style={{ borderColor: 'var(--color-warm)' }}>
          <div className="eyebrow pb-1" style={{ color: 'var(--color-warm)' }}>
            просрочено — {late.length}
          </div>
          {late.map((t) => (
            <TaskLine key={t.id} task={t} project={projectById.get(t.project_id ?? '')} showProject dense />
          ))}
        </section>
      )}

      <div
        className="grid grid-cols-1 gap-px sm:grid-cols-7"
        style={{ backgroundColor: 'var(--color-rule)' }}
      >
        {days.map((d, i) => {
          const list = dueOnDay(tasks, d)
          const minutes = list.reduce((s, t) => s + t.estimate_minutes, 0)
          const isToday = isoDate(d) === todayIso
          const weekend = i >= 5
          return (
            <div
              key={i}
              className="min-h-[56px] px-2 pb-2 sm:min-h-[170px]"
              style={{ backgroundColor: weekend ? 'var(--color-paper2)' : 'var(--color-card)' }}
            >
              <div
                className="flex items-baseline justify-between border-b py-1.5 mb-1"
                style={{ borderColor: isToday ? 'var(--color-ink)' : 'var(--color-rule2)' }}
              >
                <span className="eyebrow" style={{ color: isToday ? 'var(--color-ink)' : undefined }}>
                  {WEEKDAYS_SHORT[i]}
                </span>
                <span className="num text-[11.5px]" style={{ color: isToday ? 'var(--color-ink)' : 'var(--color-ink3)' }}>
                  {fmtDate(d)}
                </span>
              </div>
              {list.map((t) => (
                <TaskLine
                  key={t.id}
                  task={t}
                  project={projectById.get(t.project_id ?? '')}
                  showProject
                  dense
                />
              ))}
              {minutes > 0 && (
                <div className="num pt-1 text-right text-[11px] text-ink3">{fmtHours(minutes)} ч</div>
              )}
              {list.length === 0 && <div className="pt-3 text-[12px] text-ink4">—</div>}
            </div>
          )
        })}
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-3 pb-1.5">
          <span className="eyebrow">куда ушло внимание за неделю</span>
          <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-rule)' }} />
          <span className="num text-[12.5px]">
            {totalMinutes ? `${fmtHours(totalMinutes)} ч` : '—'}
          </span>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />

        {byProject.map((r) => (
          <div
            key={r.project.id}
            className="grid grid-cols-[3px_minmax(120px,1fr)_88px] items-center gap-3 border-b py-[7px] sm:grid-cols-[3px_minmax(160px,240px)_1fr_88px]"
            style={{ borderColor: 'var(--color-rule2)' }}
          >
            <span className="h-[14px] w-[3px]" style={{ backgroundColor: r.project.color }} />
            <span className="truncate text-[13px]">{r.project.name}</span>
            <span className="relative hidden h-[12px] items-center sm:flex">
              <span
                className="absolute inset-y-[3px] left-0"
                style={{
                  width: `${Math.max(r.minutes ? 1.5 : 0, (r.minutes / maxMinutes) * 100)}%`,
                  backgroundColor: r.project.color,
                }}
              />
              <span
                aria-hidden
                title={`недельный бюджет ${r.project.weekly_budget_hours} ч`}
                className="absolute inset-y-0"
                style={{
                  left: `${((r.project.weekly_budget_hours * 60) / maxMinutes) * 100}%`,
                  width: 1,
                  backgroundColor: 'var(--color-ink3)',
                }}
              />
            </span>
            <span className="num text-right text-[12.5px]" style={{ color: r.minutes ? 'var(--color-ink)' : 'var(--color-ink4)' }}>
              {r.minutes ? `${fmtHours(r.minutes)} ч` : '—'}
              <span className="text-ink4"> · {r.count}</span>
            </span>
          </div>
        ))}
        {totalMinutes === 0 && (
          <p className="py-4 text-[12.5px] text-ink3">
            На этой неделе ещё ничего не закрыто — распределение появится после первой выполненной задачи.
          </p>
        )}
      </section>
    </div>
  )
}
