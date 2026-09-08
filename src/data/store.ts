import { useSyncExternalStore } from 'react'
import type { Priority, Project, Settings, Snapshot, Subtask, Task, TaskStatus } from '../types'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../types'
import { uid } from '../lib/id'
import { buildSeed, PIGMENTS } from './seed'
import {
  cloudEnabled,
  currentUserId,
  projectRow,
  pullAll,
  pushRows,
  settingsRow,
  supabase,
  taskRow,
  type Row,
} from './cloud'

const KEY_STATE = 'puls.state.v1'
const KEY_QUEUE = 'puls.queue.v1'

export interface State {
  projects: Project[]
  tasks: Task[]
  settings: Settings
}

/** Что видит владелец в индикаторе. */
export type SyncState =
  | 'local'    // облако не настроено — только этот компьютер
  | 'signedout'
  | 'saving'
  | 'saved'
  | 'offline'
  | 'error'

let state: State = { projects: [], tasks: [], settings: { ...DEFAULT_SETTINGS } }
let queue = new Set<string>()
let sync: SyncState = cloudEnabled ? 'signedout' : 'local'
let syncError = ''
let signedIn = false
/** Последняя задача, чьё выполнение нужно отпраздновать анимацией. */
let warmedProject: { id: string; at: number } | null = null

export interface StoreSnapshot {
  state: State
  sync: SyncState
  syncError: string
  signedIn: boolean
  warmedProject: { id: string; at: number } | null
  pending: number
  version: number
}

const listeners = new Set<() => void>()
let version = 0
let snapshotCache: StoreSnapshot = {
  state, sync, syncError, signedIn, warmedProject, pending: 0, version,
}

function emit() {
  version += 1
  snapshotCache = { state, sync, syncError, signedIn, warmedProject, pending: queue.size, version }
  listeners.forEach((l) => l())
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getSnapshot() {
  return snapshotCache
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ── Локальный кэш ─────────────────────────────────────────────────────────

function persist() {
  try {
    localStorage.setItem(KEY_STATE, JSON.stringify(state))
    localStorage.setItem(KEY_QUEUE, JSON.stringify([...queue]))
  } catch {
    /* приватный режим или переполнение — работа продолжается в памяти */
  }
}

function loadLocal(): boolean {
  try {
    const raw = localStorage.getItem(KEY_STATE)
    if (!raw) return false
    const parsed = JSON.parse(raw) as State
    if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) return false
    state = {
      projects: parsed.projects,
      tasks: parsed.tasks,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
    const q = localStorage.getItem(KEY_QUEUE)
    queue = new Set(q ? (JSON.parse(q) as string[]) : [])
    return true
  } catch {
    return false
  }
}

export function initStore() {
  const had = loadLocal()
  if (!had && !cloudEnabled) {
    const seed = buildSeed()
    state = { ...seed, settings: { ...DEFAULT_SETTINGS } }
    markAll()
    persist()
  }
  emit()

  if (!cloudEnabled || !supabase) return

  supabase.auth.getSession().then(({ data }) => {
    handleSession(Boolean(data.session))
  })
  supabase.auth.onAuthStateChange((_e, session) => handleSession(Boolean(session)))

  window.addEventListener('online', () => void flush())
  window.addEventListener('offline', () => setSync('offline'))
  window.addEventListener('focus', () => {
    if (signedIn) void refresh()
  })
}

function handleSession(has: boolean) {
  const was = signedIn
  signedIn = has
  if (!has) {
    setSync('signedout')
    return
  }
  if (!was) void refresh(true)
  else void flush()
}

function setSync(s: SyncState, err = '') {
  sync = s
  syncError = err
  emit()
}

// ── Очередь изменений ─────────────────────────────────────────────────────

function mark(table: 'projects' | 'tasks' | 'settings', id: string) {
  queue.add(`${table}:${id}`)
}

function markAll() {
  state.projects.forEach((p) => mark("projects", p.id))
  mark("settings", "me")
  state.tasks.forEach((t) => mark('tasks', t.id))
}

let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (!cloudEnabled) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => void flush(), 700)
}

let flushing = false

export async function flush(): Promise<void> {
  if (!cloudEnabled || !supabase) return
  if (!signedIn) return setSync('signedout')
  if (!navigator.onLine) return setSync('offline')
  if (flushing) return
  if (queue.size === 0) return setSync('saved')

  flushing = true
  setSync('saving')
  const batch = [...queue]
  const rows: Row[] = []
  const uid = await currentUserId()
  for (const key of batch) {
    const [table, id] = key.split(/:(.+)/)
    if (table === 'projects') {
      const p = state.projects.find((x) => x.id === id)
      if (p) rows.push({ table: 'projects', row: projectRow(p) })
    } else if (table === 'settings') {
      if (uid) rows.push({ table: 'settings', row: settingsRow(state.settings, uid) })
    } else {
      const t = state.tasks.find((x) => x.id === id)
      if (t) rows.push({ table: 'tasks', row: taskRow(t) })
    }
  }
  try {
    await pushRows(rows)
    batch.forEach((k) => queue.delete(k))
    persist()
    setSync(queue.size ? 'saving' : 'saved')
    if (queue.size) scheduleFlush()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    setSync(navigator.onLine ? 'error' : 'offline', msg)
  } finally {
    flushing = false
  }
}

/** Побеждает более позднее updated_at. */
function mergeById<T extends { id: string; updated_at: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((x) => [x.id, x]))
  for (const r of remote) {
    const l = byId.get(r.id)
    if (!l || new Date(r.updated_at).getTime() > new Date(l.updated_at).getTime()) byId.set(r.id, r)
  }
  return [...byId.values()]
}

export async function refresh(first = false): Promise<void> {
  if (!cloudEnabled || !signedIn) return
  if (!navigator.onLine) return setSync('offline')
  try {
    setSync('saving')
    await flush()
    const remote = await pullAll()
    const remoteSettings = remote.settings
    state = {
      projects: mergeById(state.projects, remote.projects),
      tasks: mergeById(state.tasks, remote.tasks),
      settings:
        remoteSettings &&
        new Date(remoteSettings.updated_at).getTime() >
          new Date(state.settings.updated_at).getTime()
          ? { day_hours: Number(remoteSettings.day_hours), updated_at: remoteSettings.updated_at }
          : state.settings,
    }
    // Первый вход на чистом облаке — раскладываем стартовые проекты.
    if (first && state.projects.length === 0) {
      const seed = buildSeed()
      state = { ...state, projects: seed.projects, tasks: seed.tasks }
      markAll()
    }
    persist()
    emit()
    await flush()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    setSync(navigator.onLine ? 'error' : 'offline', msg)
  }
}

function commit() {
  persist()
  emit()
  scheduleFlush()
}

const now = () => new Date().toISOString()

// ── Проекты ───────────────────────────────────────────────────────────────

export function addProject(patch: Partial<Project> = {}): Project {
  const used = new Set(state.projects.map((p) => p.color))
  const color = PIGMENTS.find((c) => !used.has(c)) ?? PIGMENTS[state.projects.length % PIGMENTS.length]
  const p: Project = {
    id: uid(),
    name: patch.name ?? 'Новый проект',
    color: patch.color ?? color,
    description: patch.description ?? '',
    status: patch.status ?? 'active',
    weekly_budget_hours: patch.weekly_budget_hours ?? 4,
    cooldown_days: patch.cooldown_days ?? 7,
    last_touch_at: null,
    updated_at: now(),
    deleted_at: null,
  }
  state = { ...state, projects: [...state.projects, p] }
  mark('projects', p.id)
  commit()
  return p
}

export function updateProject(id: string, patch: Partial<Project>) {
  state = {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch, updated_at: now() } : p)),
  }
  mark('projects', id)
  commit()
}

/** Работа без задачи: созвон, чтение, поездка. Дата — да, часы — нет. */
export function touchProject(id: string) {
  updateProject(id, { last_touch_at: now() })
  warmedProject = { id, at: Date.now() }
  emit()
}

export function deleteProject(id: string) {
  const ts = now()
  state = {
    ...state,
    projects: state.projects.map((p) => (p.id === id ? { ...p, deleted_at: ts, updated_at: ts } : p)),
    tasks: state.tasks.map((t) =>
      t.project_id === id ? { ...t, deleted_at: ts, updated_at: ts } : t,
    ),
  }
  mark('projects', id)
  state.tasks.filter((t) => t.project_id === id).forEach((t) => mark('tasks', t.id))
  commit()
}

// ── Задачи ────────────────────────────────────────────────────────────────

export interface NewTask {
  title: string
  project_id?: string | null
  priority?: Priority
  due_date?: string | null
  estimate_minutes?: number
  status?: TaskStatus
}

export function addTask(input: NewTask): Task {
  const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.sort_order), 0)
  const t: Task = {
    id: uid(),
    project_id: input.project_id ?? null,
    title: input.title,
    priority: input.priority ?? 3,
    due_date: input.due_date ?? null,
    estimate_minutes: input.estimate_minutes ?? 0,
    status: input.status ?? 'inbox',
    done_at: null,
    sort_order: maxOrder + 1,
    note: '',
    subtasks: [],
    is_example: false,
    updated_at: now(),
    deleted_at: null,
  }
  state = { ...state, tasks: [...state.tasks, t] }
  mark('tasks', t.id)
  commit()
  return t
}

export function updateTask(id: string, patch: Partial<Task>) {
  state = {
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...patch, updated_at: now() } : t)),
  }
  mark('tasks', id)
  commit()
}

export function toggleTaskDone(id: string) {
  const t = state.tasks.find((x) => x.id === id)
  if (!t) return
  if (t.status === 'done') {
    updateTask(id, { status: 'today', done_at: null })
  } else {
    updateTask(id, { status: 'done', done_at: now() })
    if (t.project_id) {
      warmedProject = { id: t.project_id, at: Date.now() }
      emit()
    }
  }
}

export function setTaskStatus(id: string, status: TaskStatus) {
  const t = state.tasks.find((x) => x.id === id)
  if (!t) return
  if (status === 'done') return toggleTaskDone(id)
  updateTask(id, { status, done_at: null })
}

export function deleteTask(id: string) {
  updateTask(id, { deleted_at: now() })
}

export function reorderToday(orderedIds: string[]) {
  const pos = new Map(orderedIds.map((id, i) => [id, i]))
  const ts = now()
  state = {
    ...state,
    tasks: state.tasks.map((t) =>
      pos.has(t.id) ? { ...t, sort_order: pos.get(t.id)!, updated_at: ts } : t,
    ),
  }
  orderedIds.forEach((id) => mark('tasks', id))
  commit()
}

export function addSubtask(taskId: string, text: string) {
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) return
  const s: Subtask = { id: uid(), text, done: false }
  updateTask(taskId, { subtasks: [...t.subtasks, s] })
}

export function toggleSubtask(taskId: string, subId: string) {
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) return
  updateTask(taskId, {
    subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
  })
}

export function removeSubtask(taskId: string, subId: string) {
  const t = state.tasks.find((x) => x.id === taskId)
  if (!t) return
  updateTask(taskId, { subtasks: t.subtasks.filter((s) => s.id !== subId) })
}

/** Длина рабочего дня — сколько часов реально помещается. */
export function setDayHours(hours: number) {
  const v = Math.max(1, Math.min(24, hours))
  state = { ...state, settings: { day_hours: v, updated_at: now() } }
  mark('settings', 'me')
  commit()
}

export function clearWarm() {
  warmedProject = null
  emit()
}

// ── Экспорт и импорт ──────────────────────────────────────────────────────

export function exportSnapshot(): Snapshot {
  return {
    exported_at: now(),
    schema_version: SCHEMA_VERSION,
    projects: state.projects,
    tasks: state.tasks,
    settings: state.settings,
  }
}

export function importSnapshot(snap: Snapshot, mode: 'merge' | 'replace' = 'replace') {
  const projects = (snap.projects ?? []).map((p) => ({ ...p, subtasks: undefined })) as Project[]
  const tasks = (snap.tasks ?? []).map((t) => ({
    ...t,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
  }))
  const settings = snap.settings
    ? { day_hours: Number(snap.settings.day_hours) || 8, updated_at: snap.settings.updated_at }
    : state.settings
  state =
    mode === 'replace'
      ? { projects, tasks, settings }
      : {
          projects: mergeById(state.projects, projects),
          tasks: mergeById(state.tasks, tasks),
          settings,
        }
  markAll()
  commit()
}

export function wipeLocal() {
  localStorage.removeItem(KEY_STATE)
  localStorage.removeItem(KEY_QUEUE)
}

// ── Вход ──────────────────────────────────────────────────────────────────

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error('Облако не настроено')
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw new Error(error.message)
}

/** Ссылка вернулась с ошибкой — вытаскиваем её из адреса, иначе вход молчит. */
export function readAuthError(): string | null {
  const from = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ''))
  for (const part of [window.location.hash, window.location.search]) {
    if (!part) continue
    const q = from(part)
    const code = q.get('error_code') || q.get('error')
    if (!code) continue
    const text = q.get('error_description') || code
    history.replaceState(null, '', window.location.pathname)
    return decodeURIComponent(text.replace(/\+/g, ' '))
  }
  return null
}

/** Человеческий текст вместо английской строки от сервера. */
export function explainAuthError(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('rate limit')) {
    return 'Слишком часто. Встроенная почта шлёт не больше двух писем в час — подожди или введи код из письма, которое уже пришло.'
  }
  if (s.includes('expired') || s.includes('invalid') || s.includes('access_denied')) {
    return 'Ссылка уже использована или устарела: почтовые сканеры часто открывают её раньше человека. Введи код из письма — его они не трогают.'
  }
  if (s.includes('not found') || s.includes('signups not allowed')) {
    return 'Такой почты в базе нет. Проверь адрес.'
  }
  return raw
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
