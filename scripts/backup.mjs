// Снимает срез обеих таблиц (включая мягко удалённые записи)
// и кладёт его в backups/latest.json и backups/ГГГГ-ММ-ДД.json.
// Формат тот же, что у кнопки «Экспорт в JSON» в приложении.

import fs from 'node:fs'
import path from 'node:path'
import { SCHEMA_VERSION, env, plural, readAll } from './lib.mjs'

const url = env('SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
const dir = process.argv[2] ?? 'backups'

const projects = await readAll(url, key, 'projects')
const tasks = await readAll(url, key, 'tasks')
const settings = await readAll(url, key, 'settings', 'user_id')
// Таблица идей появилась в третьей версии формата: пока миграция не накатана,
// снимок обязан сниматься дальше, а не падать.
const ideas = await readAll(url, key, 'ideas').catch(() => [])

const snapshot = {
  exported_at: new Date().toISOString(),
  schema_version: SCHEMA_VERSION,
  projects,
  tasks,
  settings: settings[0] ?? null,
  ideas,
}

fs.mkdirSync(dir, { recursive: true })
const body = JSON.stringify(snapshot, null, 2)
const day = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(dir, 'latest.json'), body)
fs.writeFileSync(path.join(dir, `${day}.json`), body)

// Глубина хранения: посуточные снимки за 30 дней плюс первое число каждого месяца.
const keepFrom = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
let removed = 0
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^(\d{4})-(\d{2})-(\d{2})\.json$/)
  if (!m) continue
  const date = `${m[1]}-${m[2]}-${m[3]}`
  if (date >= keepFrom) continue
  if (m[3] === '01') continue
  fs.rmSync(path.join(dir, f))
  removed += 1
}

console.log(
  `Снимок ${day}: ${projects.length} ${plural(projects.length, 'проект', 'проекта', 'проектов')}, ` +
    `${tasks.length} ${plural(tasks.length, 'задача', 'задачи', 'задач')}, ` +
    `${ideas.length} ${plural(ideas.length, 'идея', 'идеи', 'идей')}. ` +
    `Удалено старых снимков: ${removed}.`,
)

if (projects.length === 0 && tasks.length === 0) {
  console.error('ВНИМАНИЕ: обе таблицы пусты. Проверь ключ и адрес проекта.')
  process.exit(2)
}
