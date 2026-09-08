import { useState } from 'react'
import type { Project, Task } from '../types'
import { fmtDue, fmtHours, parseIsoDate, isoDate, startOfDay } from '../lib/dates'
import { PriorityMark } from './atoms'
import { deleteTask, setTaskStatus, toggleTaskDone, updateTask } from '../data/store'

export function Checkbox({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={done ? 'Вернуть в работу' : 'Отметить выполненной'}
      className="relative grid h-[15px] w-[15px] shrink-0 place-items-center border transition-colors"
      style={{
        borderColor: done ? 'var(--color-deep)' : 'var(--color-ink3)',
        backgroundColor: done ? 'var(--color-deep)' : 'transparent',
      }}
    >
      {done && (
        <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
          <path d="M1 5.2 L3.8 8 L9 1.8" fill="none" stroke="#F2F4F1" strokeWidth="1.8" />
        </svg>
      )}
    </button>
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
  const done = task.status === 'done'
  const overdue =
    task.due_date !== null && !done && task.due_date < isoDate(startOfDay(new Date()))

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      data-task={task.id}
      className={`group flex flex-wrap ${wrap ? 'items-start' : 'items-center'} gap-x-2.5 gap-y-1 ${dense ? 'py-[5px]' : 'py-[7px]'} px-2 -mx-2 ${
        landing ? 'landing' : ''
      } ${selected ? 'bg-paper2' : 'hover:bg-paper2/70'} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <Checkbox done={done} onToggle={() => toggleTaskDone(task.id)} />
      <PriorityMark p={task.priority} />

      {showProject && (
        <span
          className="inline-block h-[7px] w-[7px] shrink-0"
          style={{ backgroundColor: project?.color ?? 'var(--color-ink4)' }}
          title={project?.name ?? 'Без проекта'}
        />
      )}

      {editing ? (
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
          className="flex-1 min-w-0 bg-transparent outline-none border-b border-ink3 text-[13.5px]"
        />
      ) : (
        <button
          onDoubleClick={() => {
            setDraft(task.title)
            setEditing(true)
          }}
          onClick={() => {
            setDraft(task.title)
            setEditing(true)
          }}
          className={`flex-1 min-w-0 text-left text-[13.5px] ${
            wrap ? 'line-clamp-2 break-words' : 'truncate'
          }`}
          style={{
            color: done ? 'var(--color-ink3)' : 'var(--color-ink)',
            textDecoration: done ? 'line-through' : 'none',
          }}
          title={task.title}
        >
          {task.title}
          {task.is_example && <span className="eyebrow ml-2">пример</span>}
        </button>
      )}

      {task.subtasks.length > 0 && (
        <span className="num text-[11px] text-ink4">
          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
        </span>
      )}

      {task.due_date && (
        <span
          className="num text-[11.5px] whitespace-nowrap"
          style={{ color: overdue ? 'var(--color-warm)' : 'var(--color-ink3)' }}
        >
          {fmtDue(task.due_date)}
        </span>
      )}

      {task.estimate_minutes > 0 && (
        <span className="num text-[11.5px] text-ink2 w-[34px] text-right">
          {fmtHours(task.estimate_minutes)} ч
        </span>
      )}

      <div className="flex w-full items-center gap-1 transition-opacity sm:w-auto sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        {!done && task.status !== 'today' && (
          <button
            onClick={() => setTaskStatus(task.id, 'today')}
            className="eyebrow border border-rule px-1.5 py-[2px] hover:bg-card"
            title="В «Сегодня»"
          >
            сегодня
          </button>
        )}
        {!done && task.status === 'today' && (
          <button
            onClick={() => setTaskStatus(task.id, 'inbox')}
            className="eyebrow border border-rule px-1.5 py-[2px] hover:bg-card"
            title="Убрать из «Сегодня»"
          >
            убрать
          </button>
        )}
        {projects && (
          <select
            value={task.project_id ?? ''}
            onChange={(e) => updateTask(task.id, { project_id: e.target.value || null })}
            className="eyebrow border border-rule bg-transparent px-1 py-[2px] max-w-[120px]"
            title="Проект"
          >
            <option value="">во входящие</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => deleteTask(task.id)}
          className="eyebrow px-1 py-[2px] hover:text-warm"
          title="Удалить"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export { parseIsoDate }
