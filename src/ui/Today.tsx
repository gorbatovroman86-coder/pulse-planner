import { useState } from 'react'
import type { Project, Task } from '../types'
import { fmtDuration } from '../lib/dates'
import { TaskLine } from './TaskLine'
import { reorderToday, setTaskStatus } from '../data/store'

const OVERLOAD_MINUTES = 6 * 60

export function Today({
  tasks,
  projects,
  landedId,
  selectedId,
}: {
  tasks: Task[]
  projects: Project[]
  landedId: string | null
  selectedId: string | null
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [hot, setHot] = useState(false)

  const total = tasks.reduce((s, t) => s + t.estimate_minutes, 0)
  const overloaded = total > OVERLOAD_MINUTES
  const byId = new Map(projects.map((p) => [p.id, p]))

  function onDrop(e: React.DragEvent, targetId: string | null) {
    e.preventDefault()
    setHot(false)
    setOverId(null)
    const id = e.dataTransfer.getData('text/task-id') || dragId
    setDragId(null)
    if (!id) return

    const inList = tasks.some((t) => t.id === id)
    if (!inList) {
      setTaskStatus(id, 'today')
      if (targetId) {
        const ids = tasks.map((t) => t.id)
        const at = ids.indexOf(targetId)
        ids.splice(at, 0, id)
        reorderToday(ids)
      }
      return
    }
    const ids = tasks.map((t) => t.id).filter((x) => x !== id)
    const at = targetId ? ids.indexOf(targetId) : ids.length
    ids.splice(at < 0 ? ids.length : at, 0, id)
    reorderToday(ids)
  }

  return (
    <aside
      aria-label="Сегодня"
      onDragOver={(e) => {
        e.preventDefault()
        setHot(true)
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => onDrop(e, null)}
      className="border transition-colors"
      style={{
        borderColor: hot ? 'var(--color-deep)' : 'var(--color-rule)',
        backgroundColor: hot ? 'color-mix(in oklab, var(--color-deep) 6%, var(--color-card))' : 'var(--color-card)',
      }}
    >
      <header className="flex items-baseline justify-between px-3 h-[34px] border-b" style={{ borderColor: 'var(--color-ink3)' }}>
        <span className="eyebrow">сегодня</span>
        <span className="num text-[13px]" style={{ color: overloaded ? 'var(--color-warm)' : 'var(--color-ink)' }}>
          {total > 0 ? fmtDuration(total) : '—'}
        </span>
      </header>

      {overloaded && (
        <p
          className="px-3 py-1.5 text-[12px] border-b"
          style={{ color: 'var(--color-warm)', borderColor: 'var(--color-rule2)' }}
        >
          Ты перепланировал день: больше 6 часов.
        </p>
      )}

      <div
        className="px-3 py-1 min-h-[52px]"
        style={{ borderBottom: tasks.length ? '1px solid var(--color-rule2)' : 'none' }}
      >
        {tasks.map((t) => (
          <div
            key={t.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(t.id)
            }}
            onDrop={(e) => {
              e.stopPropagation()
              onDrop(e, t.id)
            }}
            style={{
              borderTop: overId === t.id ? '2px solid var(--color-deep)' : '2px solid transparent',
            }}
          >
            <TaskLine
              task={t}
              project={byId.get(t.project_id ?? '') ?? null}
              showProject
              wrap
              draggable
              landing={landedId === t.id}
              selected={selectedId === t.id}
              onDragStart={(e) => {
                setDragId(t.id)
                e.dataTransfer.setData('text/task-id', t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            />
          </div>
        ))}

        {tasks.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-ink3">
            Перетащи сюда задачу из проекта
            <br />
            или нажми «сегодня» в её строке.
          </p>
        )}
      </div>
    </aside>
  )
}
