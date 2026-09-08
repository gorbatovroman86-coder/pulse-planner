// Общая часть для снятия копии и восстановления.
// Ни одной внешней зависимости: только fetch из Node.

export const SCHEMA_VERSION = 1
export const TABLES = ['projects', 'tasks']

export function env(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Не задана переменная ${name}.`)
    process.exit(1)
  }
  return v.replace(/\/+$/, '')
}

export function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

/** Читает таблицу целиком, страницами по 1000 строк. */
export async function readAll(url, key, table) {
  const out = []
  const step = 1000
  for (let from = 0; ; from += step) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: { ...headers(key), Range: `${from}-${from + step - 1}` },
    })
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
    const rows = await res.json()
    out.push(...rows)
    if (rows.length < step) break
  }
  return out
}

/** Заливает строки пачками, обновляя по id. Повторный запуск не плодит дублей. */
export async function upsertAll(url, key, table, rows, size = 500) {
  let done = 0
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size)
    const res = await fetch(`${url}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        ...headers(key),
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
    done += chunk.length
  }
  return done
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
