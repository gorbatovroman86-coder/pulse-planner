// Восстановление из файла копии: npm run restore -- backups/latest.json
// Безопасно при повторном запуске: обновляет по id, дублей не плодит.

import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { env, headers, plural, upsertAll } from './lib.mjs'

const file = process.argv[2]
if (!file) {
  console.error('Укажи файл: npm run restore -- backups/latest.json')
  process.exit(1)
}
if (!fs.existsSync(file)) {
  console.error(`Файл не найден: ${file}`)
  process.exit(1)
}

const url = env('SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')

const snap = JSON.parse(fs.readFileSync(file, 'utf8'))
if (!Array.isArray(snap.projects) || !Array.isArray(snap.tasks)) {
  console.error('Это не файл копии: нет полей projects и tasks.')
  process.exit(1)
}

// 1. Если таблиц ещё нет — накатываем схему из миграции репозитория.
const probe = await fetch(`${url}/rest/v1/projects?select=id&limit=1`, { headers: headers(key) })
if (probe.status === 404 || probe.status === 400) {
  const dbUrl = process.env.SUPABASE_DB_URL
  if (!dbUrl) {
    console.error(
      'Таблиц нет, а SUPABASE_DB_URL не задан.\n' +
        'Добавь строку подключения к базе (Supabase → Project Settings → Database → Connection string)\n' +
        'в .env как SUPABASE_DB_URL и запусти снова.',
    )
    process.exit(1)
  }
  console.log('Таблиц нет — накатываю схему...')
  execFileSync('npx', ['--yes', 'supabase@latest', 'db', 'push', '--db-url', dbUrl], {
    stdio: 'inherit',
  })
}

// 2. Проекты идут первыми: задачи на них ссылаются.
const projects = await upsertAll(url, key, 'projects', snap.projects)
const tasks = await upsertAll(url, key, 'tasks', snap.tasks)
// Настройки появились во второй версии формата: старые копии их просто не содержат.
if (snap.settings) {
  const res = await fetch(`${url}/rest/v1/settings?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([snap.settings]),
  })
  if (!res.ok) console.error('настройки не восстановлены:', res.status, await res.text())
}

const at = snap.exported_at ? new Date(snap.exported_at) : null
const when = at
  ? `${String(at.getDate()).padStart(2, '0')}.${String(at.getMonth() + 1).padStart(2, '0')}.${at.getFullYear()}`
  : 'дата в файле не указана'

console.log(
  `Восстановлено: ${projects} ${plural(projects, 'проект', 'проекта', 'проектов')}, ` +
    `${tasks} ${plural(tasks, 'задача', 'задачи', 'задач')}.\n` +
    `Срез снят: ${when}.`,
)
