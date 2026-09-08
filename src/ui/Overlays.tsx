import { useEffect, useMemo, useState } from 'react'
import type { Project, Task } from '../types'
import { fmtDue } from '../lib/dates'

export function Help({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['N', 'новая задача — фокус в поле ввода'],
    ['1', 'экран «Пульс»'],
    ['2', 'экран «Проект»'],
    ['3', 'экран «Неделя»'],
    ['/', 'поиск по задачам и проектам'],
    ['↑ ↓', 'выбор задачи в колонке «Сегодня»'],
    ['пробел', 'отметить выбранную задачу выполненной'],
    ['Esc', 'закрыть окно или снять фокус'],
    ['?', 'этот список'],
  ]
  return (
    <Sheet title="клавиши" onClose={onClose}>
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b" style={{ borderColor: 'var(--color-line2)' }}>
              <td className="num py-[7px] pr-4 text-[12.5px] w-[92px] align-top">{k}</td>
              <td className="py-[7px] text-[13px]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-4 text-[12.5px] text-ink2">
        Быстрый ввод: <span className="num">завтра</span>, <span className="num">пн</span>,{' '}
        <span className="num">14.09</span>, <span className="num">!1</span>…<span className="num">!3</span>,{' '}
        <span className="num">#проект</span>, <span className="num">90м</span> или <span className="num">1,5ч</span>.
      </p>
    </Sheet>
  )
}

export function Search({
  projects,
  tasks,
  onClose,
  onOpenProject,
}: {
  projects: Project[]
  tasks: Task[]
  onClose: () => void
  onOpenProject: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const byId = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const query = q.trim().toLowerCase()
  const foundProjects = query
    ? projects.filter((p) => !p.deleted_at && p.name.toLowerCase().includes(query))
    : []
  const foundTasks = query
    ? tasks.filter((t) => !t.deleted_at && t.title.toLowerCase().includes(query)).slice(0, 40)
    : []

  return (
    <Sheet title="поиск" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose()
            return
          }
          e.stopPropagation()
        }}
        placeholder="что ищем"
        className="h-[38px] w-full border border-line bg-paper px-3 text-[14px] outline-none placeholder:text-ink4"
      />
      <div className="max-h-[52vh] overflow-y-auto pt-3">
        {foundProjects.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              onOpenProject(p.id)
              onClose()
            }}
            className="flex w-full items-center gap-2 border-b py-[7px] text-left"
            style={{ borderColor: 'var(--color-line2)' }}
          >
            <span className="h-[13px] w-[3px]" style={{ backgroundColor: p.color }} />
            <span className="flex-1 truncate text-[13px]">{p.name}</span>
            <span className="label">проект</span>
          </button>
        ))}
        {foundTasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 border-b py-[7px]"
            style={{ borderColor: 'var(--color-line2)' }}
          >
            <span
              className="h-[7px] w-[7px] shrink-0"
              style={{ backgroundColor: byId.get(t.project_id ?? '')?.color ?? 'var(--color-ink4)' }}
            />
            <span
              className="flex-1 truncate text-[13px]"
              style={{ color: t.status === 'done' ? 'var(--color-ink3)' : 'var(--color-ink)' }}
            >
              {t.title}
            </span>
            <span className="num text-[11.5px] text-ink3">{fmtDue(t.due_date)}</span>
          </div>
        ))}
        {query && foundProjects.length === 0 && foundTasks.length === 0 && (
          <p className="py-4 text-[13px] text-ink3">Ничего не нашлось.</p>
        )}
      </div>
    </Sheet>
  )
}

function Sheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:px-6 sm:pt-[12vh]"
      style={{ backgroundColor: 'color-mix(in oklab, var(--color-ink) 28%, transparent)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] border bg-surface p-5 flip-in"
        style={{ borderColor: 'var(--color-ink3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2">
          <span className="label">{title}</span>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            esc
          </button>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />
        <div className="pt-3">{children}</div>
      </div>
    </div>
  )
}
