// Очередь доработок: список, добавление, закрытие.
//   node scripts/ideas.mjs list [статус]
//   node scripts/ideas.mjs add "заголовок" "почему"
//   node scripts/ideas.mjs done <id|начало заголовка> [хеш коммита]
//   node scripts/ideas.mjs back <id|начало заголовка>   — вернуть из очереди
// Работает служебным ключом, тем же, что копии. Владелец правит статусы в приложении.

import { execFileSync } from 'node:child_process'
import { env, headers, plural, readAll } from './lib.mjs'

const url = env('SUPABASE_URL')
const key = env('SUPABASE_SERVICE_ROLE_KEY')
const [cmd = 'list', ...args] = process.argv.slice(2)

const TITLES = {
  proposed: 'предложено',
  queued: 'в работе',
  done: 'сделано',
  dismissed: 'скрыто',
}

const alive = (rows) => rows.filter((r) => !r.deleted_at)

async function all() {
  return alive(await readAll(url, key, 'ideas', 'created_at'))
}

/** Владелец в базе один — берём его id оттуда, а не из переменной окружения. */
async function ownerId() {
  const rows = await readAll(url, key, 'settings', 'user_id')
  if (!rows.length) {
    console.error('В базе нет настроек — некому приписать идею. Зайди в приложение хотя бы раз.')
    process.exit(1)
  }
  return rows[0].user_id
}

/** Ищем по id целиком или по началу заголовка — руками id не набирают. */
function find(rows, needle) {
  const n = needle.toLowerCase()
  const hits = rows.filter(
    (r) => r.id === needle || r.title.toLowerCase().startsWith(n),
  )
  if (hits.length === 0) {
    console.error(`Не нашёл идею по «${needle}».`)
    process.exit(1)
  }
  if (hits.length > 1) {
    console.error(`Под «${needle}» подходит ${hits.length}:`)
    hits.forEach((h) => console.error(`  ${h.title}`))
    process.exit(1)
  }
  return hits[0]
}

async function patch(id, fields) {
  const res = await fetch(`${url}/rest/v1/ideas?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers(key), Prefer: 'return=minimal' },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
}

if (cmd === 'list') {
  const rows = await all()
  const want = args[0]
  const groups = want ? [want] : ['queued', 'proposed', 'done']
  for (const g of groups) {
    const mine = rows.filter((r) => r.status === g)
    if (!mine.length) continue
    console.log(`\n${TITLES[g] ?? g} — ${mine.length}`)
    for (const r of mine) {
      const ref = r.done_ref ? `  ${r.done_ref}` : ''
      console.log(`  · ${r.title}${ref}`)
      if (r.rationale) console.log(`    ${r.rationale}`)
    }
  }
  const queued = rows.filter((r) => r.status === 'queued').length
  console.log(
    queued
      ? `\nВ очереди ${queued} ${plural(queued, 'задание', 'задания', 'заданий')}.`
      : '\nОчередь пуста.',
  )
} else if (cmd === 'add') {
  const [title, rationale = ''] = args
  if (!title) {
    console.error('node scripts/ideas.mjs add "заголовок" "почему"')
    process.exit(1)
  }
  const now = new Date().toISOString()
  const rows = await all()
  if (rows.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
    console.log('Такая идея уже есть — пропускаю.')
    process.exit(0)
  }
  const res = await fetch(`${url}/rest/v1/ideas`, {
    method: 'POST',
    headers: { ...headers(key), Prefer: 'return=minimal' },
    body: JSON.stringify([
      {
        id: crypto.randomUUID(),
        user_id: await ownerId(),
        title,
        rationale,
        status: 'proposed',
        source: 'claude',
        created_at: now,
        updated_at: now,
      },
    ]),
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  console.log(`Добавлено: ${title}`)
} else if (cmd === 'done' || cmd === 'back') {
  const [needle, ref] = args
  if (!needle) {
    console.error(`node scripts/ideas.mjs ${cmd} <начало заголовка>`)
    process.exit(1)
  }
  const idea = find(await all(), needle)
  if (cmd === 'back') {
    await patch(idea.id, { status: 'proposed', queued_at: null })
    console.log(`Вернул в предложенные: ${idea.title}`)
  } else {
    const hash =
      ref ?? execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
    await patch(idea.id, { status: 'done', done_at: new Date().toISOString(), done_ref: hash })
    console.log(`Закрыто (${hash}): ${idea.title}`)
  }
} else {
  console.error(`Не знаю команду «${cmd}». Есть: list, add, done, back.`)
  process.exit(1)
}
