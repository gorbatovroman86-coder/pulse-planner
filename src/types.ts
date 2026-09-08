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

export interface Snapshot {
  exported_at: string
  schema_version: number
  projects: Project[]
  tasks: Task[]
}

export const SCHEMA_VERSION = 1
