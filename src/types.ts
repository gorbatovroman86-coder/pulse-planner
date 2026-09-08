export type ProjectStatus = 'active' | 'paused' | 'archived'
export type TaskStatus = 'inbox' | 'today' | 'done'
export type Priority = 1 | 2 | 3

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  color: string
  /** Значок стикера на доске. Пусто — берётся значок состояния. */
  emoji: string
  description: string
  status: ProjectStatus
  weekly_budget_hours: number
  cooldown_days: number
  /** Ручная отметка «я касался проекта» — созвон, чтение, поездка. */
  last_touch_at: string | null
  updated_at: string
  deleted_at: string | null
}

export interface Task {
  id: string
  project_id: string | null
  title: string
  priority: Priority
  due_date: string | null       // YYYY-MM-DD
  estimate_minutes: number
  status: TaskStatus
  done_at: string | null        // ISO
  sort_order: number
  note: string
  subtasks: Subtask[]
  is_example: boolean
  updated_at: string
  deleted_at: string | null
}

export interface Settings {
  /** Сколько часов помещается в рабочий день. */
  day_hours: number
  updated_at: string
}

export const DEFAULT_SETTINGS: Settings = { day_hours: 8, updated_at: '1970-01-01T00:00:00.000Z' }

export interface Snapshot {
  exported_at: string
  schema_version: number
  projects: Project[]
  tasks: Task[]
  settings?: Settings
}

export const SCHEMA_VERSION = 2
