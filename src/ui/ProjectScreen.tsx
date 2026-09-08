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
  currentId,
  onSelect,
}: {
  projects: Project[]
  tasks: Task[]
  currentId: string | null
  onSelect: (id: string) => void
}) {
  const alive = projects.filter((p) => !p.deleted_at)
  const current = alive.find((p) => p.id === currentId) ?? alive[0] ?? null

  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col items-start gap-6 px-4 pb-16 pt-4 md:flex-row md:gap-7 md:px-6">
      <nav className="w-full shrink-0 md:w-[236px]" aria-label="Проекты">
        <div className="eyebrow px-2 pb-1.5">все проекты</div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />
        {alive.map((p) => {
          const on = current?.id === p.id
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex w-full items-center gap-2 px-2 py-[7px] text-left border-b"
              style={{
                borderColor: 'var(--color-rule2)',
                backgroundColor: on ? 'var(--color-card)' : 'transparent',
              }}
            >
              <span className="h-[13px] w-[3px] shrink-0" style={{ backgroundColor: p.color }} />
              <span className="flex-1 truncate text-[13px]" style={{ fontWeight: on ? 500 : 350 }}>
                {p.name}
              </span>
              {p.status !== 'active' && (
                <span className="eyebrow">{p.status === 'paused' ? 'пауза' : 'архив'}</span>
              )}
            </button>
          )
        })}
        <button
          onClick={() => onSelect(addProject().id)}
          className="eyebrow mt-3 w-full border border-rule px-2 py-[7px] hover:bg-card"
        >
          + новый проект
        </button>
      </nav>

      <div className="w-full min-w-0 flex-1">
        {current ? <Detail key={current.id} project={current} tasks={tasks} /> : <p>Проектов нет.</p>}
      </div>
    </div>
  )
}

function Detail({ project, tasks }: { project: Project; tasks: Task[] }) {
  const pulse = computePulse(project, tasks)
  const mine = tasks.filter((t) => !t.deleted_at && t.project_id === project.id)
  const done = mine
    .filter((t) => t.status === 'done')
    .sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1))
  const today = mine.filter((t) => t.status === 'today')
  const inbox = mine.filter((t) => t.status === 'inbox')
  const history = projectHistory(project, tasks)
  const maxHist = Math.max(60, ...history.map((h) => h.minutes))
  const [draft, setDraft] = useState('')

  return (
    <div className="max-w-[880px]">
      <header className="flex items-start gap-3">
        <span className="mt-[7px] h-[26px] w-[4px] shrink-0" style={{ backgroundColor: project.color }} />
        <div className="min-w-0 flex-1">
          <input
            value={project.name}
            onChange={(e) => updateProject(project.id, { name: e.target.value })}
            className="w-full bg-transparent text-[24px] outline-none border-b border-transparent focus:border-rule"
            style={{ fontWeight: 300 }}
            aria-label="Название проекта"
          />
          <input
            value={project.description}
            onChange={(e) => updateProject(project.id, { description: e.target.value })}
            placeholder="короткое описание"
            className="mt-1 w-full bg-transparent text-[13px] text-ink2 outline-none border-b border-transparent focus:border-rule placeholder:text-ink4"
            aria-label="Описание проекта"
          />
        </div>
        <button
          onClick={() => touchProject(project.id)}
          className="eyebrow border border-rule px-2 py-1.5 hover:bg-card whitespace-nowrap"
        >
          отметить касание
        </button>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-4 border-y py-3 sm:grid-cols-[repeat(4,minmax(0,1fr))]" style={{ borderColor: 'var(--color-rule)' }}>
        <Stat label="вложено / бюджет, ч">
          <BudgetFraction investedMinutes={pulse.investedMinutes} budgetMinutes={pulse.budgetMinutes} />
        </Stat>
        <Stat label="простой">
          {pulse.daysSinceTouch === null ? (
            <span className="num text-[15px] text-ink4">касаний не было</span>
          ) : (
            <span className="num text-[15px]" style={{ color: pulse.cold ? 'var(--color-warm)' : 'var(--color-ink)' }}>
              {pulse.daysSinceTouch} {plural(pulse.daysSinceTouch, 'день', 'дня', 'дней')}
            </span>
          )}
        </Stat>
        <Stat label="открытых задач">
          <span className="num text-[15px]">{pulse.openTasks.length}</span>
        </Stat>
        <Stat label="три недели">
          <Strip data={pulse.strip} color={project.color} />
        </Stat>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-3"
        style={{ borderColor: 'var(--color-rule2)' }}
      >
        <NumberField
          label="недельный бюджет, ч"
          value={project.weekly_budget_hours}
          onChange={(v) => updateProject(project.id, { weekly_budget_hours: v })}
        />
        <NumberField
          label="порог остывания, дней"
          value={project.cooldown_days}
          onChange={(v) => updateProject(project.id, { cooldown_days: Math.max(1, Math.round(v)) })}
        />
        <label className="flex items-center gap-2">
          <span className="eyebrow">статус</span>
          <select
            value={project.status}
            onChange={(e) => updateProject(project.id, { status: e.target.value as Project['status'] })}
            className="border border-rule bg-transparent px-1.5 py-[3px] text-[12.5px]"
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
          className="eyebrow ml-auto hover:text-warm"
        >
          удалить проект
        </button>
      </div>

      <div className="mt-6 flex items-center gap-2">
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
          className="h-[32px] flex-1 border border-rule bg-card px-2 text-[13px] outline-none placeholder:text-ink4"
        />
      </div>

      <Group title="на сегодня" tasks={today} project={project} />
      <Group title="в работе" tasks={inbox} project={project} />
      <Group title="сделано" tasks={done} project={project} muted />

      <section className="mt-8">
        <div className="eyebrow pb-1.5">история по неделям</div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />
        <div className="flex items-end gap-2 overflow-x-auto pt-3">
          {history.map((h) => (
            <div key={h.weekStart.toISOString()} className="flex w-[54px] flex-col items-center">
              <span className="num pb-1 text-[11px] text-ink3">{h.count || ''}</span>
              <div
                className="flex w-full items-end justify-center border-b"
                style={{ height: 68, borderColor: 'var(--color-ink4)' }}
              >
                <div
                  style={{
                    width: 22,
                    height: Math.max(1, Math.round((h.minutes / maxHist) * 64)),
                    backgroundColor: h.minutes ? project.color : 'var(--color-rule)',
                  }}
                />
              </div>
              <span className="num pt-1.5 text-[10.5px] text-ink3">{fmtDate(h.weekStart)}</span>
              <span className="num text-[10.5px] text-ink2">{h.minutes ? fmtHours(h.minutes) : '—'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
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
      <span className="eyebrow">{label}</span>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        className="num w-[62px] border border-rule bg-transparent px-1.5 py-[3px] text-[12.5px] outline-none"
      />
    </label>
  )
}

function Group({
  title,
  tasks,
  project,
  muted,
}: {
  title: string
  tasks: Task[]
  project: Project
  muted?: boolean
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mt-6">
      <div className="flex items-center gap-3 pb-1.5">
        <span className="eyebrow">{title}</span>
        <span className="num text-[11px] text-ink3">{tasks.length}</span>
        <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-rule)' }} />
      </div>
      <div className="h-px w-full" style={{ backgroundColor: muted ? 'var(--color-rule)' : 'var(--color-ink3)' }} />
      {tasks.map((t) => (
        <div key={t.id} className="border-b" style={{ borderColor: 'var(--color-rule2)' }}>
          <TaskLine task={t} project={project} />
        </div>
      ))}
    </section>
  )
}
