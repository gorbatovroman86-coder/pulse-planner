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
      className="card overflow-hidden transition-shadow"
      style={hot ? { borderColor: 'var(--color-accent)', boxShadow: 'var(--shadow-pop)' } : undefined}
    >
      <header className="flex items-baseline justify-between px-4 pb-2 pt-3.5">
        <span className="text-[15px] font-medium">Сегодня</span>
        <span
          className="num text-[14px]"
          style={{ color: overloaded ? 'var(--color-alarm)' : 'var(--color-ink2)' }}
        >
          {total > 0 ? fmtDuration(total) : '—'}
        </span>
      </header>

      {overloaded && (
        <p
          className="mx-4 mb-2 rounded-lg px-3 py-2 text-[12.5px]"
          style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
        >
          Ты перепланировал день: больше шести часов.
        </p>
      )}

      <div className="px-2 pb-3">
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
              borderTop: overId === t.id ? '2px solid var(--color-accent)' : '2px solid transparent',
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
          <p className="px-3 py-6 text-center text-[13px] leading-relaxed text-ink3">
            Пусто. Перетащи сюда задачу из проекта
            <br />
            или нажми «сегодня» в её строке.
          </p>
        )}
      </div>
    </aside>
  )
}
