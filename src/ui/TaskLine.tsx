import { useEffect, useRef, useState } from 'react'
import type { Priority, Project, Task } from '../types'
import { fmtDue, fmtHours, isoDate, startOfDay } from '../lib/dates'
import { parseDuration } from '../lib/parse'
import { deleteTask, setTaskStatus, toggleTaskDone, updateTask } from '../data/store'

export function Checkbox({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={done ? 'Вернуть в работу' : 'Отметить выполненной'}
      className="group/cb relative grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors"
      style={{
        borderColor: done ? 'var(--color-accent)' : 'var(--color-ink4)',
        backgroundColor: done ? 'var(--color-accent)' : 'transparent',
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        aria-hidden
        className={done ? 'opacity-100' : 'opacity-0 group-hover/cb:opacity-40'}
      >
        <path
          d="M1.4 5.2 L3.9 7.7 L8.6 2.4"
          fill="none"
          stroke={done ? '#fff' : 'var(--color-ink2)'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/** Чип меты: заполненный виден всегда, пустой — при наведении на строку. */
function Chip({
  filled,
  onClick,
  children,
  title,
  alarm,
}: {
  filled: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
  alarm?: boolean
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={title}
      className={`shrink-0 rounded-md px-1.5 py-[1px] text-[12.5px] transition-colors hover:bg-line2 ${
        filled ? '' : 'hidden group-hover:inline-block'
      }`}
      style={{ color: alarm ? 'var(--color-alarm)' : filled ? 'var(--color-ink2)' : 'var(--color-ink4)' }}
    >
      {children}
    </button>
  )
}

function InlineInput({
  value,
  onSave,
  onCancel,
  width = 58,
  type = 'text',
}: {
  value: string
  onSave: (v: string) => void
  onCancel: () => void
  width?: number
  type?: string
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    if (type === 'text') ref.current?.select()
  }, [type])
  return (
    <input
      ref={ref}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => onSave(draft)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(draft)
        if (e.key === 'Escape') onCancel()
        e.stopPropagation()
      }}
      className="num shrink-0 rounded-md border px-1.5 py-[1px] text-[12.5px] outline-none"
      style={{ width, borderColor: 'var(--color-accent)' }}
    />
  )
}

export function TaskLine({
  task,
  project,
  projects,
  showProject = false,
  draggable = false,
  dense = false,
  onDragStart,
  selected = false,
  landing = false,
  wrap = false,
}: {
  task: Task
  project?: Project | null
  projects?: Project[]
  showProject?: boolean
  draggable?: boolean
  dense?: boolean
  onDragStart?: (e: React.DragEvent) => void
  selected?: boolean
  landing?: boolean
  wrap?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [field, setField] = useState<'none' | 'time' | 'due'>('none')
  const done = task.status === 'done'
  const overdue = task.due_date !== null && !done && task.due_date < isoDate(startOfDay(new Date()))

  function saveTime(v: string) {
    setField('none')
    const t = v.trim()
    if (t === '') return updateTask(task.id, { estimate_minutes: 0 })
    const m = parseDuration(t)
    if (m !== null) updateTask(task.id, { estimate_minutes: m })
  }

  function saveDue(v: string) {
    setField('none')
    updateTask(task.id, { due_date: v || null })
  }

  function cyclePriority() {
    const next = ((task.priority % 3) + 1) as Priority
    updateTask(task.id, { priority: next })
  }

  const meta = (
    <div className={`flex items-center gap-1 ${wrap ? 'pt-1' : ''}`}>
      {field === 'time' ? (
        <InlineInput
          value={task.estimate_minutes ? String(task.estimate_minutes) : ''}
          onSave={saveTime}
          onCancel={() => setField('none')}
        />
      ) : (
        <Chip
          filled={task.estimate_minutes > 0}
          onClick={() => setField('time')}
          title="Оценка: минуты числом, либо «90м» или «1,5ч»"
        >
          {task.estimate_minutes > 0 ? (
            <span className="num">{fmtHours(task.estimate_minutes)} ч</span>
          ) : (
            '+ время'
          )}
        </Chip>
      )}

      {field === 'due' ? (
        <InlineInput
          type="date"
          width={132}
          value={task.due_date ?? ''}
          onSave={saveDue}
          onCancel={() => setField('none')}
        />
      ) : (
        <Chip
          filled={Boolean(task.due_date)}
          onClick={() => setField('due')}
          title="Срок"
          alarm={overdue}
        >
          {task.due_date ? <span className="num">{fmtDue(task.due_date)}</span> : '+ срок'}
        </Chip>
      )}

      <Chip
        filled={task.priority < 3}
        onClick={cyclePriority}
        title="Важность: 1 — самая высокая. Клик переключает"
        alarm={task.priority === 1}
      >
        {task.priority < 3 ? `!${task.priority}` : '+ важность'}
      </Chip>
    </div>
  )

  const actions = (
    <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
      {!done && task.status !== 'today' && (
        <button onClick={() => setTaskStatus(task.id, 'today')} className="btn btn-ghost btn-sm">
          сегодня
        </button>
      )}
      {!done && task.status === 'today' && (
        <button onClick={() => setTaskStatus(task.id, 'inbox')} className="btn btn-ghost btn-sm">
          убрать
        </button>
      )}
      {projects && (
        <select
          value={task.project_id ?? ''}
          onChange={(e) => updateTask(task.id, { project_id: e.target.value || null })}
          className="btn btn-quiet btn-sm max-w-[150px]"
          title="Переложить в проект"
        >
          <option value="">без проекта</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={() => deleteTask(task.id)}
        className="btn btn-ghost btn-sm"
        aria-label="Удалить задачу"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )

  const title = editing ? (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim()) updateTask(task.id, { title: draft.trim() })
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') {
          setDraft(task.title)
          setEditing(false)
        }
        e.stopPropagation()
      }}
      className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
    />
  ) : (
    <button
      onClick={() => {
        setDraft(task.title)
        setEditing(true)
      }}
      className={`min-w-0 flex-1 text-left text-[14.5px] leading-[1.35] ${wrap ? '' : 'truncate'}`}
      style={{
        color: done ? 'var(--color-ink3)' : 'var(--color-ink)',
        textDecoration: done ? 'line-through' : 'none',
      }}
      title={task.title}
    >
      {task.title}
    </button>
  )

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      data-task={task.id}
      className={`group relative flex ${wrap ? 'items-start' : 'items-center'} gap-2.5 rounded-lg px-2 ${
        dense ? 'py-1.5' : 'py-2'
      } ${landing ? 'landing' : ''} ${selected ? 'bg-sunken' : 'hover:bg-hover'} ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
    >
      {task.priority === 1 && !done && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-[60%] w-[2px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: 'var(--color-alarm)' }}
        />
      )}

      <span className={wrap ? 'pt-[2px]' : ''}>
        <Checkbox done={done} onToggle={() => toggleTaskDone(task.id)} />
      </span>

      {showProject && project && (
        <span
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${wrap ? 'mt-[7px]' : ''}`}
          style={{ backgroundColor: project.color }}
          title={project.name}
        />
      )}

      {wrap ? (
        <div className="min-w-0 flex-1">
          <div className="flex">{title}</div>
          <div className="flex flex-wrap items-center gap-1">
            {meta}
            {actions}
          </div>
        </div>
      ) : (
        <>
          {title}
          {meta}
          {actions}
        </>
      )}
    </div>
  )
}
