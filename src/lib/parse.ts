import type { Priority, Project } from '../types'
import { WEEKDAYS_FULL, WEEKDAYS_SHORT, addDays, isoDate, startOfDay } from './dates'

export interface ParsedInput {
  title: string
  priority: Priority
  due_date: string | null
  estimate_minutes: number
  project_id: string | null
  /** Что было написано после #, даже если проект не нашёлся. */
  projectQuery: string | null
  projectMatched: boolean
}

const RE_PRIORITY = /^!([123])$/
const RE_TAG = /^#(.+)$/
const RE_ESTIMATE = /^(\d+(?:[.,]\d+)?)(мин|м|ч|час|часа|часов|h|m)$/i
const RE_NUMBER = /^(\d+(?:[.,]\d+)?)$/
const RE_UNIT = /^(мин|м|ч|час|часа|часов|h|m)$/i
const RE_DDMM = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/

function toMinutes(value: string, unit: string): number {
  const n = Number(value.replace(',', '.'))
  const u = unit.toLowerCase()
  const isHours = u === 'ч' || u === 'час' || u === 'часа' || u === 'часов' || u === 'h'
  return Math.round(isHours ? n * 60 : n)
}

/** Ближайший день недели: сегодня, если совпало, иначе следующий. */
function nextWeekday(target: number, from = new Date()): Date {
  const base = startOfDay(from)
  const cur = (base.getDay() + 6) % 7
  const delta = (target - cur + 7) % 7
  return addDays(base, delta)
}

function matchDate(token: string): string | null {
  const t = token.toLowerCase()
  const today = startOfDay(new Date())
  if (t === 'сегодня') return isoDate(today)
  if (t === 'завтра') return isoDate(addDays(today, 1))
  if (t === 'послезавтра') return isoDate(addDays(today, 2))

  const short = WEEKDAYS_SHORT.indexOf(t)
  if (short >= 0) return isoDate(nextWeekday(short))
  const full = WEEKDAYS_FULL.indexOf(t)
  if (full >= 0) return isoDate(nextWeekday(full))

  const dm = t.match(RE_DDMM)
  if (dm) {
    const day = Number(dm[1])
    const month = Number(dm[2])
    if (day < 1 || day > 31 || month < 1 || month > 12) return null
    let year = dm[3] ? Number(dm[3]) : today.getFullYear()
    if (year < 100) year += 2000
    let d = new Date(year, month - 1, day)
    // Без года: 14.09 в декабре — это следующий год.
    if (!dm[3] && d.getTime() < today.getTime()) d = new Date(year + 1, month - 1, day)
    return isoDate(d)
  }
  return null
}

/** Проект ищется по началу слов в названии: «#МЭЗ» → «МЭЗ Карасук/Бийск». */
export function findProject(query: string, projects: Project[]): Project | null {
  const q = query.toLowerCase().replace(/[«»"]/g, '')
  if (!q) return null
  const alive = projects.filter((p) => !p.deleted_at && p.status !== 'archived')
  const exact = alive.find((p) => p.name.toLowerCase() === q)
  if (exact) return exact
  const byStart = alive.find((p) => p.name.toLowerCase().startsWith(q))
  if (byStart) return byStart
  const byWord = alive.find((p) =>
    p.name
      .toLowerCase()
      .split(/[\s/«»"(),—-]+/)
      .some((w) => w.startsWith(q)),
  )
  if (byWord) return byWord
  return alive.find((p) => p.name.toLowerCase().includes(q)) ?? null
}

export function parseInput(raw: string, projects: Project[]): ParsedInput {
  const tokens = raw.split(/\s+/).filter(Boolean)
  const kept: string[] = []

  let priority: Priority = 3
  let due: string | null = null
  let minutes = 0
  let projectQuery: string | null = null

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]

    const p = t.match(RE_PRIORITY)
    if (p) {
      priority = Number(p[1]) as Priority
      continue
    }

    const tag = t.match(RE_TAG)
    if (tag) {
      projectQuery = tag[1]
      continue
    }

    const est = t.match(RE_ESTIMATE)
    if (est) {
      minutes = toMinutes(est[1], est[2])
      continue
    }

    // Раздельная запись: «90 м», «1,5 ч»
    const num = t.match(RE_NUMBER)
    if (num && i + 1 < tokens.length && RE_UNIT.test(tokens[i + 1])) {
      minutes = toMinutes(num[1], tokens[i + 1])
      i++
      continue
    }

    const d = matchDate(t)
    if (d) {
      due = d
      continue
    }

    kept.push(t)
  }

  const project = projectQuery ? findProject(projectQuery, projects) : null

  return {
    title: kept.join(' ').trim(),
    priority,
    due_date: due,
    estimate_minutes: minutes,
    project_id: project?.id ?? null,
    projectQuery,
    projectMatched: Boolean(project),
  }
}
