import { useEffect, useState } from 'react'
import type { Task } from '../types'
import type { Pulse } from '../lib/derive'
import { LIFE, LIFE_ORDER, lifeOf, EMOJI_CHOICES, type Life } from '../lib/life'
import { adviseProject } from '../lib/advisor'
import { fmtDate, fmtHours, plural } from '../lib/dates'
import { Gauge, Strip } from './atoms'
import { TaskLine } from './TaskLine'
import { addTask, touchProject, updateProject } from '../data/store'

export function Board({
  pulses,
  tasks,
  warmedId,
  revealId,
  onOpenProject,
}: {
  pulses: Pulse[]
  tasks: Task[]
  warmedId: string | null
  revealId: string | null
  onOpenProject: (id: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [hotBand, setHotBand] = useState<Life | null>(null)
  const [refused, setRefused] = useState<string>('')

  useEffect(() => {
    if (revealId) setOpenId(revealId)
  }, [revealId])

  const byLife = new Map<Life, Pulse[]>()
  for (const life of LIFE_ORDER) byLife.set(life, [])
  for (const p of pulses) byLife.get(lifeOf(p))!.push(p)

  // Ненавязчивое напоминание — только самому забытому, одному на экран.
  const forgotten =
    [...pulses]
      .filter((p) => lifeOf(p) === 'dead')
      .sort((a, b) => (b.daysSinceTouch ?? 9999) - (a.daysSinceTouch ?? 9999))[0] ?? null

  const opened = pulses.find((p) => p.project.id === openId) ?? null

  function onDropTo(life: Life) {
    const id = dragId
    setDragId(null)
    setHotBand(null)
    if (!id) return
    if (life === 'fire') {
      touchProject(id)
      setRefused('')
    } else {
      setRefused(
        'Сюда перетащить нельзя: состояние считается из закрытых задач и касаний, руками его не поставить. В «Горит» — можно, это отметит касание.',
      )
      setTimeout(() => setRefused(''), 6000)
    }
  }

  return (
    <section aria-label="Доска проектов" className="flex flex-col gap-3">
      {LIFE_ORDER.map((life) => {
        const look = LIFE[life]
        const list = byLife.get(life)!
        if (list.length === 0 && life !== 'fire') return null
        return (
          <div
            key={life}
            onDragOver={(e) => {
              if (!dragId) return
              e.preventDefault()
              setHotBand(life)
            }}
            onDragLeave={() => setHotBand((b) => (b === life ? null : b))}
            onDrop={(e) => {
              e.preventDefault()
              onDropTo(life)
            }}
            className={`card p-3 transition-colors ${hotBand === life ? 'band-hot' : ''}`}
            style={{ backgroundColor: hotBand === life ? undefined : look.soft }}
          >
            <div className="flex items-center gap-2 px-1 pb-2">
              <span className="text-[16px] leading-none">{look.emoji}</span>
              <span className="text-[13.5px] font-medium" style={{ color: look.ink }}>
                {look.title}
              </span>
              <span className="count">{list.length}</span>
              <span className="hidden text-[12.5px] text-ink4 sm:block">
                {hotBand === life && dragId
                  ? life === 'fire'
                    ? 'отпусти — отмечу касание'
                    : 'сюда нельзя'
                  : look.hint}
              </span>
            </div>

            {list.length === 0 ? (
              <p className="px-1 pb-1 text-[13px] text-ink4">
                Пусто. Закрой сегодня хоть одну задачу — проект переедет сюда.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {list.map((p) => (
                  <Sticker
                    key={p.project.id}
                    pulse={p}
                    life={life}
                    active={openId === p.project.id}
                    warmed={warmedId === p.project.id}
                    nudge={forgotten?.project.id === p.project.id}
                    onOpen={() => setOpenId((v) => (v === p.project.id ? null : p.project.id))}
                    onDragStart={() => setDragId(p.project.id)}
                    onDragEnd={() => {
                      setDragId(null)
                      setHotBand(null)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {refused && (
        <p
          className="flip-in rounded-lg px-3 py-2 text-[13px]"
          style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
        >
          {refused}
        </p>
      )}

      {opened && (
        <Detail
          key={opened.project.id}
          pulse={opened}
          tasks={tasks}
          onClose={() => setOpenId(null)}
          onOpenProject={onOpenProject}
        />
      )}

      {pulses.length === 0 && (
        <p className="card px-5 py-8 text-[14px] text-ink3">
          Активных проектов нет. Добавь проект на экране «Проект».
        </p>
      )}
    </section>
  )
}

function Sticker({
  pulse,
  life,
  active,
  warmed,
  nudge,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  pulse: Pulse
  life: Life
  active: boolean
  warmed: boolean
  nudge: boolean
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const p = pulse.project
  const look = LIFE[life]
  const [dragging, setDragging] = useState(false)
  const [picker, setPicker] = useState(false)
  const days = pulse.daysSinceTouch


  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/project-id', p.id)
        setDragging(true)
        onDragStart()
      }}
      onDragEnd={() => {
        setDragging(false)
        onDragEnd()
      }}
      onClick={onOpen}
      className={`sticker ${look.anim} ${dragging ? 'dragging' : ''} ${nudge ? 'nudging' : ''} ${
        warmed ? 'warming' : ''
      } relative w-[224px] cursor-pointer rounded-xl`}
      style={{ ['--pigment' as string]: p.color }}
    >
      <div
        className="sticker-body flex h-full min-h-[122px] flex-col overflow-hidden rounded-xl border bg-surface"
        style={{
          borderColor: active ? p.color : 'var(--color-line)',
          boxShadow: active ? `0 0 0 1px ${p.color}` : 'var(--shadow-card)',
        }}
      >
        {/* Цветная кромка — главный опознавательный знак стикера */}
        <div className="h-[5px] w-full shrink-0" style={{ backgroundColor: p.color }} />

        <div className="flex flex-1 flex-col p-3">
          <div className="flex items-start gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setPicker((v2) => !v2)
              }}
              className="life-emoji shrink-0 rounded-md px-0.5 text-[20px] leading-none hover:bg-hover"
              title={`${look.title} · клик — сменить значок`}
            >
              {p.emoji || look.emoji}
            </button>
            <span className="min-w-0 flex-1 text-[14px] font-medium leading-[1.25]">{p.name}</span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-1.5 text-[12.5px] text-ink3">
            {pulse.noTasks ? (
              <span style={{ color: 'var(--color-alarm)' }}>нет задач</span>
            ) : (
              <span>
                {pulse.openTasks.length}{' '}
                {plural(pulse.openTasks.length, 'задача', 'задачи', 'задач')}
              </span>
            )}
            <span className="text-ink4">·</span>
            <span
              className="num"
              style={{ color: life === 'dead' ? 'var(--color-alarm)' : 'var(--color-ink3)' }}
            >
              {days === null
                ? 'ни разу'
                : days === 0
                  ? 'сегодня'
                  : `${days} ${plural(days, 'день', 'дня', 'дней')}`}
            </span>
          </div>

          <div className="flex-1" />

          {/* Одна полоса на стикер: неделя против бюджета */}
          <div className="mt-2 flex items-center gap-2">
            <Gauge
              investedMinutes={pulse.investedMinutes}
              budgetMinutes={pulse.budgetMinutes}
              color={p.color}
              width={116}
            />
            <span className="num text-[11.5px] text-ink4">
              {pulse.investedMinutes ? fmtHours(pulse.investedMinutes) : '0'}/
              {fmtHours(pulse.budgetMinutes)} ч
            </span>
          </div>
        </div>
      </div>

      {picker && (
        <div
          className="card flip-in absolute left-0 top-[calc(100%+6px)] z-30 w-[236px] p-2"
          style={{ boxShadow: 'var(--shadow-pop)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                onClick={() => {
                  updateProject(p.id, { emoji: e })
                  setPicker(false)
                }}
                className="rounded-md p-1 text-[17px] leading-none hover:bg-hover"
              >
                {e}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              updateProject(p.id, { emoji: '' })
              setPicker(false)
            }}
            className="btn btn-ghost btn-sm mt-1 w-full justify-center"
          >
            без значка
          </button>
        </div>
      )}
    </div>
  )
}

function Detail({
  pulse,
  tasks,
  onClose,
  onOpenProject,
}: {
  pulse: Pulse
  tasks: Task[]
  onClose: () => void
  onOpenProject: (id: string) => void
}) {
  const p = pulse.project
  const [draft, setDraft] = useState('')
  const advice = adviseProject(pulse, tasks)

  function add(title?: string) {
    const text = (title ?? draft).trim()
    if (!text) return
    addTask({ title: text, project_id: p.id, status: 'inbox' })
    setDraft('')
  }

  return (
    <div className="card flip-in overflow-hidden" style={{ boxShadow: 'var(--shadow-pop)' }}>
      <div
        className="flex items-center gap-2.5 border-b px-4 py-3"
        style={{ borderColor: 'var(--color-line2)', boxShadow: `inset 3px 0 0 ${p.color}` }}
      >
        <span className="text-[17px] leading-none">{p.emoji || '·'}</span>
        <span className="flex-1 text-[15px] font-medium">{p.name}</span>
        {pulse.nextDue && (
          <span className="text-[12.5px] text-ink3">
            ближайший срок{' '}
            <span
              className="num"
              style={{ color: pulse.overdue ? 'var(--color-alarm)' : 'var(--color-ink)' }}
            >
              {fmtDate(pulse.nextDue)}
            </span>
          </span>
        )}
        <span className="hidden items-center gap-2 sm:flex" title="Закрытые часы за три недели">
          <span className="text-[12.5px] text-ink3">три недели</span>
          <Strip data={pulse.strip} color={p.color} height={20} cell={4} gap={2} />
        </span>
        <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Свернуть">
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Подсказчик: разбор состояния и готовый следующий шаг */}
      <div className="px-4 pt-3">
        <div className="flex flex-col gap-1.5">
          {advice.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 rounded-lg px-2.5 py-2"
              style={{ backgroundColor: 'var(--color-sunken)' }}
            >
              <span className="pt-[1px] text-[15px] leading-none">{a.emoji}</span>
              <span className="flex-1 text-[13px] leading-relaxed text-ink2">{a.text}</span>
              {a.suggest && (
                <button
                  onClick={() => add(a.suggest)}
                  className="btn btn-quiet btn-sm shrink-0"
                  title={`Создать задачу «${a.suggest}»`}
                >
                  Добавить
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-2 pt-2">
        {pulse.openTasks.length > 0 ? (
          pulse.openTasks.map((t) => (
            <TaskLine
              key={t.id}
              task={t}
              project={p}
              dense
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/task-id', t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
            />
          ))
        ) : (
          <p className="px-2 py-1 text-[13px] text-ink4">Открытых задач нет.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
            e.stopPropagation()
          }}
          placeholder={`Новая задача — ${p.name}`}
          className="field h-[34px] min-w-[200px] flex-1 text-[14px] placeholder:text-ink4"
        />
        <button onClick={() => add()} className="btn btn-quiet">
          Добавить
        </button>
        <button
          onClick={() => touchProject(p.id)}
          className="btn btn-quiet"
          title="Созвон, чтение, поездка — дата обновится, часы не вырастут"
        >
          Отметить касание
        </button>
        <button onClick={() => onOpenProject(p.id)} className="btn btn-ghost">
          Весь проект
        </button>
      </div>
    </div>
  )
}
