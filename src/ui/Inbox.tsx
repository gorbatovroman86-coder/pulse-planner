import type { Project, Task } from '../types'
import { TaskLine } from './TaskLine'

export function Inbox({ tasks, projects }: { tasks: Task[]; projects: Project[] }) {
  return (
    <section aria-label="Входящие" className="mt-7">
      <div className="flex items-center gap-3 pb-1.5 px-2">
        <span className="eyebrow">входящие</span>
        <span className="num text-[11px] text-ink3">{tasks.length}</span>
        <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-rule)' }} />
        <span className="hidden text-[12px] text-ink3 sm:block">
          задачи без проекта — раскидай по проектам
        </span>
      </div>
      <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />

      <div className="px-2">
        {tasks.map((t) => (
          <div key={t.id} className="border-b" style={{ borderColor: 'var(--color-rule2)' }}>
            <TaskLine
              task={t}
              projects={projects}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/task-id', t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            />
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="py-4 text-[12.5px] text-ink3">Пусто. Всё разложено по проектам.</p>
        )}
      </div>
    </section>
  )
}
