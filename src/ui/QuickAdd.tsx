import { useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from '../types'
import { parseInput } from '../lib/parse'
import { fmtDate, fmtDuration } from '../lib/dates'
import { addTask } from '../data/store'

export function QuickAdd({
  projects,
  focusSignal,
  defaultProjectId = null,
}: {
  projects: Project[]
  focusSignal: number
  defaultProjectId?: string | null
}) {
  const [raw, setRaw] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusSignal > 0) ref.current?.focus()
  }, [focusSignal])

  const parsed = useMemo(() => parseInput(raw, projects), [raw, projects])
  const target = parsed.project_id
    ? projects.find((p) => p.id === parsed.project_id) ?? null
    : defaultProjectId
      ? projects.find((p) => p.id === defaultProjectId) ?? null
      : null

  function submit() {
    const title = parsed.title.trim()
    if (!title) return
    addTask({
      title,
      project_id: target?.id ?? null,
      priority: parsed.priority,
      due_date: parsed.due_date,
      estimate_minutes: parsed.estimate_minutes,
      status: 'inbox',
    })
    setRaw('')
  }

  const show = raw.trim().length > 0

  return (
    <div className="relative">
      <div className="card flex items-center gap-3 px-3.5 py-2.5">
        <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden className="shrink-0 text-ink4">
          <path d="M9 3.5 V14.5 M3.5 9 H14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') {
              setRaw('')
              ref.current?.blur()
            }
            e.stopPropagation()
          }}
          placeholder="Новая задача — «согласовать ПСР завтра !1 #МЭЗ 90м»"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink4"
          aria-label="Новая задача"
        />
        <kbd
          className="num hidden shrink-0 rounded-md px-1.5 py-[2px] text-[11px] sm:block"
          style={{ backgroundColor: 'var(--color-sunken)', color: 'var(--color-ink4)' }}
        >
          N
        </kbd>
        <button
          onClick={submit}
          disabled={!parsed.title.trim()}
          className={`btn shrink-0 ${parsed.title.trim() ? 'btn-primary' : 'btn-quiet'}`}
        >
          <span className="hidden sm:inline">Добавить</span>
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="sm:hidden">
            <path d="M3 8.4 L6.4 12 L13 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {show && (
        <div
          className="card flip-in absolute left-0 right-0 top-[calc(100%+6px)] z-20 flex flex-wrap items-center gap-x-5 gap-y-2 px-3.5 py-2.5"
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          <Field label="Текст" value={parsed.title || '—'} strong />
          <Field
            label="Проект"
            value={
              target
                ? target.name
                : parsed.projectQuery
                  ? `«${parsed.projectQuery}» не найден → Входящие`
                  : 'Входящие'
            }
            color={target?.color}
            warn={Boolean(parsed.projectQuery && !parsed.projectMatched)}
          />
          <Field label="Срок" value={parsed.due_date ? fmtDate(parsed.due_date) : '—'} mono />
          <Field
            label="Оценка"
            value={parsed.estimate_minutes ? fmtDuration(parsed.estimate_minutes) : '—'}
            mono
          />
          <Field label="Приоритет" value={String(parsed.priority)} mono />
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  strong,
  color,
  warn,
}: {
  label: string
  value: string
  mono?: boolean
  strong?: boolean
  color?: string
  warn?: boolean
}) {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className="text-[12.5px] text-ink4">{label}</span>
      {color && (
        <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span
        className={`${mono ? 'num text-[13px]' : 'text-[13.5px]'} truncate`}
        style={{
          color: warn ? 'var(--color-alarm)' : 'var(--color-ink)',
          fontWeight: strong ? 500 : 400,
        }}
      >
        {value}
      </span>
    </span>
  )
}
