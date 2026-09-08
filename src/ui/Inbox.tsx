import type { Project, Task } from '../types'
import { TaskLine } from './TaskLine'

export function Inbox({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  return (
    <section aria-label="Входящие" className="card mt-5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 pb-1 pt-4">
        <span className="text-[13px] font-medium text-ink2">Входящие</span>
        <span className="count">{tasks.length}</span>
        <span className="hidden text-[12.5px] text-ink4 sm:block">
          задачи без проекта — разложи по проектам
        </span>
      </div>

      <div className="px-3 pb-3">
        {tasks.map((t) => (
          <TaskLine
            key={t.id}
            task={t}
            projects={projects}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/task-id', t.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
          />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-3 text-[13px] text-ink3">Пусто. Всё разложено по проектам.</p>
        )}
      </div>
    </section>
  )
}
