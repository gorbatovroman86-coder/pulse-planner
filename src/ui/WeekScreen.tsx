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
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-5 sm:px-8">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">
          <span className="num">{fmtDate(weekStart)}</span>
          <span className="font-normal text-ink4"> — </span>
          <span className="num">{fmtDate(addDays(weekStart, 6))}</span>
        </h2>
        <div className="flex gap-1.5">
          <button onClick={() => onShift(-1)} className="btn btn-quiet btn-sm">
            ← Пред.
          </button>
          <button onClick={() => onShift(0)} className="btn btn-quiet btn-sm">
            Текущая
          </button>
          <button onClick={() => onShift(1)} className="btn btn-quiet btn-sm">
            След. →
          </button>
        </div>
      </header>

      {late.length > 0 && (
        <section className="card mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pb-1 pt-3">
            <span className="text-[13px] font-medium" style={{ color: 'var(--color-alarm)' }}>
              Просрочено
            </span>
            <span className="count">{late.length}</span>
          </div>
          <div className="px-2 pb-2">
            {late.map((t) => (
              <TaskLine
                key={t.id}
                task={t}
                project={projectById.get(t.project_id ?? '')}
                showProject
                dense
              />
            ))}
          </div>
        </section>
      )}

      <section className="card grid grid-cols-1 overflow-hidden sm:grid-cols-7">
        {days.map((d, i) => {
          const list = dueOnDay(tasks, d)
          const minutes = list.reduce((s, t) => s + t.estimate_minutes, 0)
          const isToday = isoDate(d) === todayIso
          const weekend = i >= 5
          return (
            <div
              key={i}
              className={`min-h-[64px] px-2.5 pb-3 sm:min-h-[190px] ${i > 0 ? 'border-t sm:border-l sm:border-t-0' : ''}`}
              style={{
                borderColor: 'var(--color-line2)',
                backgroundColor: isToday
                  ? 'var(--color-accent-soft)'
                  : weekend
                    ? 'var(--color-sunken)'
                    : undefined,
              }}
            >
              <div className="flex items-baseline justify-between pb-1 pt-3">
                <span
                  className="text-[13px] font-medium"
                  style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-ink2)' }}
                >
                  {WEEKDAYS_SHORT[i]}
                </span>
                <span
                  className="num text-[12px]"
                  style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-ink4)' }}
                >
                  {fmtDate(d)}
                </span>
              </div>
              <div className="-mx-2">
                {list.map((t) => (
                  <TaskLine
                    key={t.id}
                    task={t}
                    project={projectById.get(t.project_id ?? '')}
                    showProject
                    wrap
                    dense
                  />
                ))}
              </div>
              {minutes > 0 && (
                <div className="num pt-1 text-right text-[11.5px] text-ink3">{fmtHours(minutes)} ч</div>
              )}
              {list.length === 0 && <div className="pt-1 text-[13px] text-ink4">—</div>}
            </div>
          )
        })}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center gap-2 px-5 pb-2 pt-4">
          <span className="text-[13px] font-medium text-ink2">Куда ушло внимание за неделю</span>
          <span className="flex-1" />
          <span className="num text-[13.5px] font-medium">
            {totalMinutes ? `${fmtHours(totalMinutes)} ч` : '—'}
          </span>
        </div>

        <div className="px-5 pb-4">
          {byProject.map((r) => (
            <div
              key={r.project.id}
              className="grid grid-cols-[3px_minmax(120px,1fr)_84px] items-center gap-3 border-t py-2.5 sm:grid-cols-[3px_minmax(160px,230px)_1fr_84px]"
              style={{ borderColor: 'var(--color-line2)' }}
            >
              <span className="h-[16px] w-[3px] rounded-full" style={{ backgroundColor: r.project.color }} />
              <span className="truncate text-[14px]">{r.project.name}</span>
              <span className="relative hidden h-[10px] items-center rounded-full sm:flex" style={{ backgroundColor: 'var(--color-line2)' }}>
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${Math.max(r.minutes ? 2 : 0, (r.minutes / maxMinutes) * 100)}%`,
                    backgroundColor: r.project.color,
                  }}
                />
                <span
                  aria-hidden
                  title={`недельный бюджет ${r.project.weekly_budget_hours} ч`}
                  className="absolute -inset-y-[3px] w-[2px] rounded-full"
                  style={{
                    left: `${((r.project.weekly_budget_hours * 60) / maxMinutes) * 100}%`,
                    backgroundColor: 'var(--color-ink4)',
                  }}
                />
              </span>
              <span
                className="num text-right text-[13.5px]"
                style={{ color: r.minutes ? 'var(--color-ink)' : 'var(--color-ink4)' }}
              >
                {r.minutes ? `${fmtHours(r.minutes)} ч` : '—'}
                <span className="text-ink4"> · {r.count}</span>
              </span>
            </div>
          ))}
          {totalMinutes === 0 && (
            <p className="pt-3 text-[13.5px] text-ink3">
              На этой неделе ещё ничего не закрыто — распределение появится после первой
              выполненной задачи.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
