import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import type { Project, Settings, Task } from '../types'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Облако настроено? Без ключей приложение работает только на этом компьютере. */
export const cloudEnabled = Boolean(URL && ANON)

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(URL!, ANON!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'puls.auth',
      },
    })
  : null

export type Row = { table: 'projects' | 'tasks' | 'settings'; row: Record<string, unknown> }

/** Наружу уходят только колонки схемы: user_id ставит база из auth.uid(). */
export function projectRow(p: Project): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    emoji: p.emoji ?? '',
    description: p.description,
    status: p.status,
    weekly_budget_hours: p.weekly_budget_hours,
    cooldown_days: p.cooldown_days,
    last_touch_at: p.last_touch_at,
    updated_at: p.updated_at,
    deleted_at: p.deleted_at,
  }
}

export function taskRow(t: Task): Record<string, unknown> {
  return {
    id: t.id,
    project_id: t.project_id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    estimate_minutes: t.estimate_minutes,
    status: t.status,
    done_at: t.done_at,
    sort_order: t.sort_order,
    note: t.note,
    subtasks: t.subtasks,
    is_example: t.is_example,
    updated_at: t.updated_at,
    deleted_at: t.deleted_at,
  }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function settingsRow(s: Settings, userId: string): Record<string, unknown> {
  return { user_id: userId, day_hours: s.day_hours, updated_at: s.updated_at }
}

export async function pushRows(rows: Row[]): Promise<void> {
  if (!supabase) return
  const projects = rows.filter((r) => r.table === 'projects').map((r) => r.row)
  const tasks = rows.filter((r) => r.table === 'tasks').map((r) => r.row)
  const settings = rows.filter((r) => r.table === 'settings').map((r) => r.row)
  if (settings.length) {
    const { error } = await supabase.from('settings').upsert(settings, { onConflict: 'user_id' })
    if (error) throw new Error(error.message)
  }
  if (projects.length) {
    const { error } = await supabase.from('projects').upsert(projects, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }
  if (tasks.length) {
    const { error } = await supabase.from('tasks').upsert(tasks, { onConflict: 'id' })
    if (error) throw new Error(error.message)
  }
}

export async function pullAll(): Promise<{
  projects: Project[]
  tasks: Task[]
  settings: Settings | null
}> {
  if (!supabase) return { projects: [], tasks: [], settings: null }
  const [p, t, s] = await Promise.all([
    supabase.from('projects').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('settings').select('*').maybeSingle(),
  ])
  if (p.error) throw new Error(p.error.message)
  if (t.error) throw new Error(t.error.message)
  return {
    projects: ((p.data ?? []) as unknown as Project[]).map((x) => ({ ...x, emoji: x.emoji ?? '' })),
    tasks: ((t.data ?? []) as unknown as Task[]).map((x) => ({
      ...x,
      subtasks: Array.isArray(x.subtasks) ? x.subtasks : [],
    })),
    settings: (s.data as unknown as Settings) ?? null,
  }
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
