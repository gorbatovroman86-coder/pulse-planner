import { useState } from 'react'
import type { Project, Task } from '../types'
import { computePulse, projectHistory } from '../lib/derive'
import { fmtDate, fmtHours, plural } from '../lib/dates'
import { BudgetFraction, Strip } from './atoms'
import { TaskLine } from './TaskLine'
import { addProject, addTask, deleteProject, touchProject, updateProject } from '../data/store'

export function ProjectScreen({
  projects,
  tasks,
  dayHours,
  currentId,
  onSelect,
}: {
  projects: Project[]
  tasks: Task[]
  dayHours: number
  currentId: string | null
  onSelect: (id: string) => void
}) {
  const alive = projects.filter((p) => !p.deleted_at)
  const current = alive.find((p) => p.id === currentId) ?? alive[0] ?? null

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-5 px-4 pb-16 pt-5 md:flex-row sm:px-8">
      <nav className="card w-full shrink-0 overflow-hidden md:w-[248px]" aria-label="Проекты">
        <div className="label px-4 pb-1 pt-3.5">Все проекты</div>
        <div className="pb-2">
          {alive.map((p) => {
            const on = current?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-hover"
                style={{ backgroundColor: on ? 'var(--color-sunken)' : undefined }}
              >
                <span
                  className="h-[16px] w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span
                  className="flex-1 truncate text-[14px]"
                  style={{ fontWeight: on ? 500 : 400 }}
                >
                  {p.name}
                </span>
                {p.status !== 'active' && (
                  <span className="text-[12px] text-ink4">
                    {p.status === 'paused' ? 'пауза' : 'архив'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="border-t px-3 py-2.5" style={{ borderColor: 'var(--color-line2)' }}>
          <button onClick={() => onSelect(addProject().id)} className="btn btn-ghost w-full justify-center">
            + Новый проект
          </button>
        </div>
      </nav>

      <div className="w-full min-w-0 flex-1">
        {current ? (
          <Detail key={current.id} project={current} tasks={tasks} dayHours={dayHours} />
        ) : (
          <p className="text-ink3">Проектов нет.</p>
        )}
      </div>
    </div>
  )
}

function Detail({
  project,
  tasks,
  dayHours,
}: {
  project: Project
  tasks: Task[]
  dayHours: number
}) {
  const pulse = computePulse(project, tasks)
  const mine = tasks.filter((t) => !t.deleted_at && t.project_id === project.id)
  const done = mine.filter((t) => t.status === 'done').sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1))
  const today = mine.filter((t) => t.status === 'today')
  const inbox = mine.filter((t) => t.status === 'inbox')
  const history = projectHistory(project, tasks)
  const maxHist = Math.max(60, ...history.map((h) => h.minutes))
  const [draft, setDraft] = useState('')
  const [settings, setSettings] = useState(false)

  return (
    <div className="max-w-[860px]">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span
            className="mt-[6px] h-[28px] w-[4px] shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0 flex-1">
            <input
              value={project.name}
              onChange={(e) => updateProject(project.id, { name: e.target.value })}
              className="w-full rounded-md bg-transparent text-[22px] font-semibold tracking-[-0.01em] outline-none hover:bg-hover focus:bg-hover"
              aria-label="Название проекта"
            />
            <input
              value={project.description}
              onChange={(e) => updateProject(project.id, { description: e.target.value })}
              placeholder="короткое описание"
              className="mt-0.5 w-full rounded-md bg-transparent text-[14px] text-ink2 outline-none placeholder:text-ink4 hover:bg-hover focus:bg-hover"
              aria-label="Описание проекта"
            />
          </div>
          <button onClick={() => touchProject(project.id)} className="btn btn-quiet shrink-0">
            Отметить касание
          </button>
        </div>

        <div
          className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4"
          style={{ borderColor: 'var(--color-line2)' }}
        >
          <Stat label="Вложено за неделю">
            <BudgetFraction
              investedMinutes={pulse.investedMinutes}
              budgetMinutes={pulse.budgetMinutes}
              size={16}
              unit="ч"
            />
          </Stat>
          <Stat label="Без касания">
            {pulse.daysSinceTouch === null ? (
              <span className="text-[14px] text-ink3">касаний не было</span>
            ) : (
              <span
                className="num text-[16px] font-medium"
                style={{ color: pulse.cold ? 'var(--color-alarm)' : 'var(--color-ink)' }}
              >
                {pulse.daysSinceTouch}{' '}
                <span className="text-[13px] font-normal text-ink3">
                  {plural(pulse.daysSinceTouch, 'день', 'дня', 'дней')}
                </span>
              </span>
            )}
          </Stat>
          <Stat label="Открытых задач">
            <span className="num text-[16px] font-medium">{pulse.openTasks.length}</span>
          </Stat>
          <Stat label="Три недели">
            <Strip data={pulse.strip} color={project.color} dayMinutes={Math.round(dayHours * 60)} />
          </Stat>
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--color-line2)' }}>
          <button onClick={() => setSettings((v) => !v)} className="btn btn-ghost btn-sm -ml-2.5">
            {settings ? 'Скрыть настройки' : 'Настройки проекта'}
          </button>
          {settings && (
            <div className="flip-in mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <NumberField
                label="Недельный бюджет, ч"
                value={project.weekly_budget_hours}
                onChange={(v) => updateProject(project.id, { weekly_budget_hours: v })}
              />
              <NumberField
                label="Порог остывания, рабочих дней"
                value={project.cooldown_days}
                onChange={(v) => updateProject(project.id, { cooldown_days: Math.max(1, Math.round(v)) })}
              />
              <label className="flex items-center gap-2">
                <span className="label">Статус</span>
                <select
                  value={project.status}
                  onChange={(e) => updateProject(project.id, { status: e.target.value as Project['status'] })}
                  className="field h-[32px] text-[13.5px]"
                >
                  <option value="active">активный</option>
                  <option value="paused">на паузе</option>
                  <option value="archived">архив</option>
                </select>
              </label>
              <button
                onClick={() => {
                  if (confirm(`Удалить проект «${project.name}» вместе с задачами?`)) deleteProject(project.id)
                }}
                className="btn btn-ghost ml-auto"
                style={{ color: 'var(--color-alarm)' }}
              >
                Удалить проект
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                addTask({ title: draft.trim(), project_id: project.id })
                setDraft('')
              }
              e.stopPropagation()
            }}
            placeholder="Новая задача в этом проекте"
            className="field w-full text-[14px] placeholder:text-ink4"
            style={{ backgroundColor: 'var(--color-sunken)' }}
          />
        </div>
        <Group title="На сегодня" tasks={today} project={project} />
        <Group title="В работе" tasks={inbox} project={project} />
        <Group title="Сделано" tasks={done} project={project} />
        {mine.length === 0 && (
          <p className="px-5 pb-4 text-[13.5px] text-ink3">
            Задач ещё нет. Добавь первую — и проект начнёт считать пульс.
          </p>
        )}
      </div>

      <section className="card mt-5 p-5">
        <div className="label pb-3">История по неделям</div>
        <div className="flex items-end gap-4 overflow-x-auto">
          <div className="flex h-[92px] shrink-0 flex-col justify-between pb-[34px] text-right">
            <span className="num text-[11px] text-ink4">{fmtHours(maxHist)} ч</span>
            <span className="num text-[11px] text-ink4">0</span>
          </div>
          {history.map((h) => (
            <div key={h.weekStart.toISOString()} className="flex w-[52px] shrink-0 flex-col items-center">
              <div
                className="flex h-[58px] w-full items-end justify-center border-b"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <div
                  className="w-[20px] rounded-t-[3px]"
                  style={{
                    height: Math.max(2, Math.round((h.minutes / maxHist) * 56)),
                    backgroundColor: h.minutes ? project.color : 'var(--color-line2)',
                  }}
                  title={h.minutes ? `${fmtHours(h.minutes)} ч, задач: ${h.count}` : 'ничего не закрыто'}
                />
              </div>
              <span className="num pt-1.5 text-[11px] text-ink3">{fmtDate(h.weekStart)}</span>
              <span className="num text-[11px]" style={{ color: h.minutes ? 'var(--color-ink2)' : 'var(--color-ink4)' }}>
                {h.minutes ? fmtHours(h.minutes) : '—'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-ink3">{label}</span>
      {children}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="label">{label}</span>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        className="field num h-[32px] w-[74px] text-[13.5px]"
      />
    </label>
  )
}

function Group({ title, tasks, project }: { title: string; tasks: Task[]; project: Project }) {
  if (tasks.length === 0) return null
  return (
    <section className="border-t" style={{ borderColor: 'var(--color-line2)' }}>
      <div className="flex items-center gap-2 px-5 pb-1 pt-3">
        <span className="text-[13px] font-medium text-ink2">{title}</span>
        <span className="count">{tasks.length}</span>
      </div>
      <div className="px-3 pb-2">
        {tasks.map((t) => (
          <TaskLine key={t.id} task={t} project={project} />
        ))}
      </div>
    </section>
  )
}
