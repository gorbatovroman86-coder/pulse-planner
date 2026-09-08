import type { Project, Task } from '../types'
import { DAY, daysBetween, isoDate, parseIsoDate, startOfDay, startOfWeek } from './dates'

export interface Pulse {
  project: Project
  /** Часы, закрытые задачами с понедельника текущей недели. */
  investedMinutes: number
  budgetMinutes: number
  openTasks: Task[]
  todayTasks: Task[]
  /** Ближайший срок среди открытых задач. */
  nextDue: string | null
  overdue: number
  /** Последнее касание: максимум из ручной отметки и выполнений задач. */
  lastTouch: string | null
  daysSinceTouch: number | null
  cold: boolean
  noTasks: boolean
  /** Лента: минуты, закрытые в каждый из последних STRIP_DAYS дней. */
  strip: number[]
}

export const STRIP_DAYS = 21

export function aliveProjects(projects: Project[]): Project[] {
  return projects.filter((p) => !p.deleted_at)
}

export function aliveTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.deleted_at)
}

export function isOpen(t: Task): boolean {
  return !t.deleted_at && t.status !== 'done'
}

export function computePulse(project: Project, tasks: Task[], now = new Date()): Pulse {
  const mine = aliveTasks(tasks).filter((t) => t.project_id === project.id)
  const weekStart = startOfWeek(now).getTime()
  const today = startOfDay(now)

  let investedMinutes = 0
  let lastDone: number | null = null
  const strip = new Array<number>(STRIP_DAYS).fill(0)
  const stripStart = today.getTime() - (STRIP_DAYS - 1) * DAY

  for (const t of mine) {
    if (t.status !== 'done' || !t.done_at) continue
    const at = new Date(t.done_at).getTime()
    if (at >= weekStart) investedMinutes += t.estimate_minutes
    if (lastDone === null || at > lastDone) lastDone = at
    const dayStart = startOfDay(t.done_at).getTime()
    if (dayStart >= stripStart) {
      const idx = Math.round((dayStart - stripStart) / DAY)
      if (idx >= 0 && idx < STRIP_DAYS) strip[idx] += t.estimate_minutes
    }
  }

  const openTasks = mine
    .filter(isOpen)
    .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order)
  const todayTasks = mine.filter((t) => t.status === 'today')

  const withDue = openTasks.filter((t) => t.due_date).map((t) => t.due_date!)
  withDue.sort()
  const nextDue = withDue[0] ?? null
  const todayIso = isoDate(today)
  const overdue = withDue.filter((d) => d < todayIso).length

  const manual = project.last_touch_at ? new Date(project.last_touch_at).getTime() : null
  const touchMs = Math.max(manual ?? 0, lastDone ?? 0) || null
  const lastTouch = touchMs ? new Date(touchMs).toISOString() : null
  const daysSinceTouch = touchMs === null ? null : daysBetween(new Date(touchMs), now)

  return {
    project,
    investedMinutes,
    budgetMinutes: Math.round(project.weekly_budget_hours * 60),
    openTasks,
    todayTasks,
    nextDue,
    overdue,
    lastTouch,
    daysSinceTouch,
    cold: daysSinceTouch === null || daysSinceTouch >= project.cooldown_days,
    noTasks: openTasks.length === 0,
    strip,
  }
}

/** Остывшие — наверх; дальше по убыванию простоя. */
export function sortPulses(list: Pulse[]): Pulse[] {
  return [...list].sort((a, b) => {
    if (a.cold !== b.cold) return a.cold ? -1 : 1
    const ad = a.daysSinceTouch ?? 9999
    const bd = b.daysSinceTouch ?? 9999
    if (ad !== bd) return bd - ad
    return a.project.name.localeCompare(b.project.name, 'ru')
  })
}

export function todayList(tasks: Task[]): Task[] {
  return aliveTasks(tasks)
    .filter((t) => t.status === 'today')
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function inboxList(tasks: Task[]): Task[] {
  return aliveTasks(tasks)
    .filter((t) => t.status === 'inbox' && t.project_id === null)
    .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order)
}

/** Часы, вложенные в каждый проект с понедельника — для экрана «Неделя». */
export function weekByProject(
  projects: Project[],
  tasks: Task[],
  weekStart: Date,
): { project: Project; minutes: number; count: number }[] {
  const from = weekStart.getTime()
  const to = from + 7 * DAY
  const acc = new Map<string, { minutes: number; count: number }>()
  for (const t of aliveTasks(tasks)) {
    if (t.status !== 'done' || !t.done_at) continue
    const at = new Date(t.done_at).getTime()
    if (at < from || at >= to) continue
    const key = t.project_id ?? '—'
    const cur = acc.get(key) ?? { minutes: 0, count: 0 }
    cur.minutes += t.estimate_minutes
    cur.count += 1
    acc.set(key, cur)
  }
  return aliveProjects(projects)
    .map((p) => ({ project: p, ...(acc.get(p.id) ?? { minutes: 0, count: 0 }) }))
    .filter((r) => r.minutes > 0 || r.project.status === 'active')
    .sort((a, b) => b.minutes - a.minutes)
}

/** История по неделям для экрана проекта. */
export function projectHistory(
  project: Project,
  tasks: Task[],
  weeks = 8,
  now = new Date(),
): { weekStart: Date; minutes: number; count: number }[] {
  const cur = startOfWeek(now)
  const out: { weekStart: Date; minutes: number; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(cur.getTime() - i * 7 * DAY)
    const we = ws.getTime() + 7 * DAY
    let minutes = 0
    let count = 0
    for (const t of aliveTasks(tasks)) {
      if (t.project_id !== project.id || t.status !== 'done' || !t.done_at) continue
      const at = new Date(t.done_at).getTime()
      if (at >= ws.getTime() && at < we) {
        minutes += t.estimate_minutes
        count += 1
      }
    }
    out.push({ weekStart: ws, minutes, count })
  }
  return out
}

export function dueOnDay(tasks: Task[], day: Date): Task[] {
  const iso = isoDate(day)
  return aliveTasks(tasks)
    .filter((t) => t.due_date === iso && t.status !== 'done')
    .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order)
}

export function overdueTasks(tasks: Task[], now = new Date()): Task[] {
  const iso = isoDate(startOfDay(now))
  return aliveTasks(tasks)
    .filter((t) => t.status !== 'done' && t.due_date !== null && t.due_date < iso)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
}

export { parseIsoDate }
