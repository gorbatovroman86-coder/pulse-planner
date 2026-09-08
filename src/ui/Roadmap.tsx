import { useState } from 'react'
import type { Idea, IdeaStatus } from '../types'
import { fmtDate } from '../lib/dates'
import { addIdea, setIdeaStatus } from '../data/store'

/** Живые идеи: скрытые остаются в базе, но с глаз уходят. */
function aliveIdeas(ideas: Idea[]): Idea[] {
  return ideas.filter((i) => !i.deleted_at)
}

function byStatus(ideas: Idea[], status: IdeaStatus): Idea[] {
  return aliveIdeas(ideas)
    .filter((i) => i.status === status)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

const GROUPS: { id: IdeaStatus; emoji: string; title: string; hint: string; ink: string }[] = [
  { id: 'queued', emoji: '🔨', title: 'В работе', hint: 'ждёт меня в очереди', ink: 'var(--color-accent)' },
  { id: 'proposed', emoji: '💡', title: 'Предложено', hint: 'решай, брать или нет', ink: '#B45309' },
  { id: 'done', emoji: '✅', title: 'Сделано', hint: 'внедрено и опубликовано', ink: 'var(--color-ink2)' },
]

/**
 * Блок свежих предложений в правой колонке «Пульса».
 * Показывает не больше трёх: главный экран не должен превращаться в бэклог.
 */
export function Proposals({ ideas }: { ideas: Idea[] }) {
  const fresh = byStatus(ideas, 'proposed').slice(0, 3)
  if (fresh.length === 0) return null

  return (
    <section className="card mt-5 overflow-hidden" aria-label="Предложения по доработке">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3.5">
        <span className="text-[14px] leading-none">💡</span>
        <span className="text-[13px] font-medium">Доработки</span>
        <span className="count">{byStatus(ideas, 'proposed').length}</span>
      </div>
      {fresh.map((i) => (
        <div
          key={i.id}
          className="border-t px-4 py-2.5"
          style={{ borderColor: 'var(--color-line2)' }}
        >
          <p className="text-[13.5px] leading-snug">{i.title}</p>
          {i.rationale && <p className="mt-1 text-[12.5px] leading-relaxed text-ink3">{i.rationale}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => setIdeaStatus(i.id, 'queued')} className="btn btn-quiet btn-sm">
              В работу
            </button>
            <button
              onClick={() => setIdeaStatus(i.id, 'dismissed')}
              className="btn btn-ghost btn-sm text-ink3"
            >
              Скрыть
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

/** Отдельный экран: полный список с историей внедрённого. */
export function RoadmapScreen({ ideas }: { ideas: Idea[] }) {
  const [draft, setDraft] = useState('')
  const queued = byStatus(ideas, 'queued')
  const done = byStatus(ideas, 'done')

  function add() {
    const text = draft.trim()
    if (!text) return
    addIdea(text, '', 'owner')
    setDraft('')
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-16 pt-5 sm:px-8">
      <div className="pb-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Роадмэп</h1>
        <p className="mt-1 text-[13.5px] text-ink3">
          {queued.length > 0 ? (
            <>
              В очереди <span className="num">{queued.length}</span> — заберу в следующую сессию.
            </>
          ) : done.length > 0 ? (
            <>
              Очередь пуста. Внедрено <span className="num">{done.length}</span>.
            </>
          ) : (
            'Пока пусто. Идеи появляются здесь по ходу работы над продуктом.'
          )}
        </p>
      </div>

      <div className="card flex items-center gap-2 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Своя идея — что доработать в «Пульсе»"
          className="field h-[36px] flex-1 text-[14px] placeholder:text-ink4"
        />
        {/* Не «Добавить»: наверху экрана уже есть кнопка с таким же словом
            у быстрого ввода задач, и два одинаковых слова рядом путают. */}
        <button onClick={add} className="btn btn-quiet">
          Предложить
        </button>
      </div>

      {GROUPS.map((g) => {
        const rows = byStatus(ideas, g.id)
        if (rows.length === 0) return null
        return (
          <section key={g.id} className="card mt-5 overflow-hidden" aria-label={g.title}>
            <div
              className="flex items-center gap-2 px-5 pb-2 pt-4"
              style={{ backgroundColor: g.id === 'done' ? 'var(--color-sunken)' : undefined }}
            >
              <span className="text-[14px] leading-none">{g.emoji}</span>
              <span className="text-[13px] font-medium" style={{ color: g.ink }}>
                {g.title}
              </span>
              <span className="count">{rows.length}</span>
              <span className="hidden text-[12.5px] text-ink4 sm:block">{g.hint}</span>
            </div>
            {rows.map((i) => (
              <Row key={i.id} idea={i} />
            ))}
          </section>
        )
      })}
    </div>
  )
}

function Row({ idea }: { idea: Idea }) {
  const done = idea.status === 'done'
  return (
    <div
      className="border-t px-5 py-3"
      style={{
        borderColor: 'var(--color-line2)',
        backgroundColor: done ? 'var(--color-sunken)' : undefined,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[14.5px] leading-snug"
            style={{ color: done ? 'var(--color-ink2)' : 'var(--color-ink)' }}
          >
            {idea.title}
          </p>
          {idea.rationale && (
            <p className="mt-1 text-[13px] leading-relaxed text-ink3">{idea.rationale}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {done ? (
            <span className="whitespace-nowrap text-[12.5px] text-ink4">
              {fmtDate(idea.done_at)}
              {idea.done_ref && <span className="num ml-2">{idea.done_ref}</span>}
            </span>
          ) : idea.status === 'queued' ? (
            <button
              onClick={() => setIdeaStatus(idea.id, 'proposed')}
              className="btn btn-ghost btn-sm text-ink3"
              title="Передумал — вернуть в предложенные"
            >
              Вернуть
            </button>
          ) : (
            <>
              <button onClick={() => setIdeaStatus(idea.id, 'queued')} className="btn btn-quiet btn-sm">
                В работу
              </button>
              <button
                onClick={() => setIdeaStatus(idea.id, 'dismissed')}
                className="btn btn-ghost btn-sm text-ink3"
              >
                Скрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
