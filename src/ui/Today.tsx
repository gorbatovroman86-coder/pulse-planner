import { useEffect, useRef, useState } from 'react'
import type { Project, Task } from '../types'
import { fmtDuration } from '../lib/dates'
import { TaskLine } from './TaskLine'
import { reorderToday, setDayHours, setTaskStatus } from '../data/store'

export function Today({
  tasks,
  projects,
  landedId,
  selectedId,
  dayHours,
}: {
  tasks: Task[]
  projects: Project[]
  landedId: string | null
  selectedId: string | null
  dayHours: number
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [hot, setHot] = useState(false)

  const capacity = Math.round(dayHours * 60)
  const planned = tasks.reduce((s, t) => s + t.estimate_minutes, 0)
  const doneMinutes = tasks
    .filter((t) => t.status === 'done')
    .reduce((s, t) => s + t.estimate_minutes, 0)
  const left = capacity - planned
  const over = planned > capacity
  const byId = new Map(projects.map((p) => [p.id, p]))

  const donePart = capacity > 0 ? Math.min(1, doneMinutes / capacity) : 0
  const plannedPart = capacity > 0 ? Math.min(1, planned / capacity) : 0

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
      <header className="px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-medium">Сегодня</span>
          <span className="flex items-baseline gap-1 text-[13.5px]">
            <span
              className="num font-medium"
              style={{ color: over ? 'var(--color-alarm)' : 'var(--color-ink)' }}
            >
              {planned > 0 ? fmtDuration(planned) : '0'}
            </span>
            <span className="text-ink3">из</span>
            <DayHours hours={dayHours} />
          </span>
        </div>

        {/* Заполнение дня: тёмное — уже сделано, светлое — ещё предстоит */}
        <div
          className="relative mt-2.5 h-[8px] overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--color-line2)' }}
          title={`Запланировано ${fmtDuration(planned)} из ${fmtDuration(capacity)}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{
              width: `${plannedPart * 100}%`,
              backgroundColor: over ? 'var(--color-alarm)' : 'var(--color-accent)',
              opacity: 0.45,
            }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{
              width: `${donePart * 100}%`,
              backgroundColor: over ? 'var(--color-alarm)' : 'var(--color-accent)',
            }}
          />
        </div>

        <div className="mt-1.5 text-[12.5px]">
          {over ? (
            <span style={{ color: 'var(--color-alarm)' }}>
              Перебор {fmtDuration(planned - capacity)} — день столько не вместит.
            </span>
          ) : planned === 0 ? (
            <span className="text-ink3">День пустой: {fmtDuration(capacity)} свободно.</span>
          ) : (
            <span className="text-ink3">
              {doneMinutes > 0 && <>сделано {fmtDuration(doneMinutes)} · </>}
              осталось свободного {fmtDuration(left)}
            </span>
          )}
        </div>
      </header>

      <div className="border-t px-2 pb-3 pt-1" style={{ borderColor: 'var(--color-line2)' }}>
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
          <p className="px-3 py-5 text-center text-[13px] leading-relaxed text-ink3">
            Пусто. Перетащи сюда задачу из проекта
            <br />
            или нажми «сегодня» в её строке.
          </p>
        )}
      </div>
    </aside>
  )
}

/** Длина рабочего дня правится прямо здесь — отдельного экрана настроек нет. */
function DayHours({ hours }: { hours: number }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(hours))
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.select()
  }, [editing])

  function save() {
    const v = Number(draft.replace(',', '.'))
    if (Number.isFinite(v) && v > 0) setDayHours(v)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(String(hours))
          setEditing(true)
        }}
        className="num rounded-md px-1 font-medium text-ink2 underline decoration-line decoration-dotted underline-offset-4 hover:bg-hover"
        title="Сколько часов помещается в твой день"
      >
        {String(hours).replace('.', ',')} ч
      </button>
    )
  }

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') setEditing(false)
        e.stopPropagation()
      }}
      className="num w-[46px] rounded-md border px-1 text-[13.5px] outline-none"
      style={{ borderColor: 'var(--color-accent)' }}
      aria-label="Часов в дне"
    />
  )
}
