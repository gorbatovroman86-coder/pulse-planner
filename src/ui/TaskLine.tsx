import { useState } from 'react'
import type { Project, Task } from '../types'
import { fmtDue, fmtHours, isoDate, startOfDay } from '../lib/dates'
import { PriorityMark } from './atoms'
import { deleteTask, setTaskStatus, toggleTaskDone, updateTask } from '../data/store'

export function Checkbox({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={done ? 'Вернуть в работу' : 'Отметить выполненной'}
      className="group/cb relative grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors"
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
  const overdue = task.due_date !== null && !done && task.due_date < isoDate(startOfDay(new Date()))

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      data-task={task.id}
      className={`group flex items-start gap-2.5 rounded-lg px-2 ${dense ? 'py-2' : 'py-2.5'} ${
        landing ? 'landing' : ''
      } ${selected ? 'bg-sunken' : 'hover:bg-hover'} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span className="pt-[2px]">
        <Checkbox done={done} onToggle={() => toggleTaskDone(task.id)} />
      </span>

      {showProject && project && (
        <span
          className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
          title={project.name}
        />
      )}

      <div className="min-w-0 flex-1">
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
            className="w-full bg-transparent text-[14.5px] outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(task.title)
              setEditing(true)
            }}
            className={`block w-full text-left text-[14.5px] leading-[1.35] ${wrap ? '' : 'truncate'}`}
            style={{
              color: done ? 'var(--color-ink3)' : 'var(--color-ink)',
              textDecoration: done ? 'line-through' : 'none',
            }}
            title={task.title}
          >
            {task.title}
          </button>
        )}

        {(task.due_date || task.estimate_minutes > 0 || task.priority < 3 || task.subtasks.length > 0 || task.is_example) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
            <PriorityMark p={task.priority} />
            {task.due_date && (
              <span
                className="num"
                style={{ color: overdue ? 'var(--color-alarm)' : 'var(--color-ink3)' }}
              >
                {fmtDue(task.due_date)}
              </span>
            )}
            {task.estimate_minutes > 0 && (
              <span className="num" style={{ color: 'var(--color-ink3)' }}>
                {fmtHours(task.estimate_minutes)} ч
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="num" style={{ color: 'var(--color-ink3)' }}>
                {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
              </span>
            )}
            {task.is_example && <span style={{ color: 'var(--color-ink4)' }}>пример</span>}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
          className="btn btn-ghost btn-sm hover:text-alarm"
          aria-label="Удалить задачу"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
