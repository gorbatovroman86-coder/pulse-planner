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
      <div className="flex items-center gap-3 border border-rule bg-card px-3 h-[42px]">
        <span className="eyebrow shrink-0">новая задача</span>
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
          placeholder="согласовать ПСР по Карасуку завтра !1 #МЭЗ 90м"
          className="flex-1 bg-transparent outline-none placeholder:text-ink4 text-[14px]"
          aria-label="Новая задача"
        />
        <button
          onClick={submit}
          disabled={!parsed.title.trim()}
          className="eyebrow border border-rule px-2 py-1 hover:bg-paper2 disabled:opacity-35 disabled:hover:bg-transparent"
        >
          добавить
        </button>
      </div>

      {show && (
        <div className="absolute left-0 right-0 top-[42px] z-20 border border-t-0 border-rule bg-card px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Field label="текст" value={parsed.title || '—'} strong />
          <Field
            label="проект"
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
          <Field label="срок" value={parsed.due_date ? fmtDate(parsed.due_date) : '—'} mono />
          <Field label="оценка" value={parsed.estimate_minutes ? fmtDuration(parsed.estimate_minutes) : '—'} mono />
          <Field label="приоритет" value={String(parsed.priority)} mono />
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
    <span className="flex items-baseline gap-1.5 min-w-0">
      <span className="eyebrow">{label}</span>
      {color && <span className="inline-block h-[7px] w-[7px] shrink-0" style={{ backgroundColor: color }} />}
      <span
        className={`${mono ? 'num text-[12.5px]' : 'text-[13px]'} truncate`}
        style={{
          color: warn ? 'var(--color-warm)' : 'var(--color-ink)',
          fontWeight: strong ? 500 : 400,
        }}
      >
        {value}
      </span>
    </span>
  )
}
