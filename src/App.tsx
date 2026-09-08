import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloudEnabled } from './data/cloud'
import { clearWarm, initStore, toggleTaskDone, useStore } from './data/store'
import { todayList } from './lib/derive'
import { PulseScreen } from './ui/PulseScreen'
import { ProjectScreen } from './ui/ProjectScreen'
import { WeekScreen } from './ui/WeekScreen'
import { QuickAdd } from './ui/QuickAdd'
import { SyncLine } from './ui/SyncLine'
import { DataMenu } from './ui/DataMenu'
import { Help, Search } from './ui/Overlays'
import { Auth } from './ui/Auth'

type Screen = 'pulse' | 'project' | 'week'

const TABS: [Screen, string, string][] = [
  ['pulse', 'Пульс', '1'],
  ['project', 'Проект', '2'],
  ['week', 'Неделя', '3'],
]

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    initStore()
    setReady(true)
  }, [])

  const { state, sync, syncError, signedIn, warmedProject, pending } = useStore()
  const [screen, setScreen] = useState<Screen>('pulse')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [overlay, setOverlay] = useState<'none' | 'help' | 'search'>('none')
  const [focusSignal, setFocusSignal] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const lastLanded = useRef<string | null>(null)

  const active = useMemo(
    () => state.projects.filter((p) => !p.deleted_at && p.status === 'active'),
    [state.projects],
  )
  const today = useMemo(() => todayList(state.tasks), [state.tasks])

  // Подсветка потепления живёт полторы секунды и гаснет сама.
  useEffect(() => {
    if (!warmedProject) return
    const t = setTimeout(() => clearWarm(), 1500)
    return () => clearTimeout(t)
  }, [warmedProject])

  const openProject = useCallback((id: string) => {
    setProjectId(id)
    setScreen('project')
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      const typing =
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

      if (e.key === 'Escape') {
        setOverlay('none')
        if (typing) (el as HTMLElement).blur()
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return

      const k = e.key.toLowerCase()
      if (k === 'n' || k === 'т') {
        e.preventDefault()
        setOverlay('none')
        setFocusSignal((v) => v + 1)
      } else if (e.key === '1') setScreen('pulse')
      else if (e.key === '2') setScreen('project')
      else if (e.key === '3') setScreen('week')
      else if (e.key === '/' || e.key === '.') {
        e.preventDefault()
        setOverlay('search')
      } else if (e.key === '?') {
        e.preventDefault()
        setOverlay('help')
      } else if (e.key === ' ') {
        if (!selected) return
        e.preventDefault()
        toggleTaskDone(selected)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (today.length === 0) return
        e.preventDefault()
        const i = today.findIndex((t) => t.id === selected)
        const next =
          e.key === 'ArrowDown'
            ? Math.min(today.length - 1, i < 0 ? 0 : i + 1)
            : Math.max(0, i < 0 ? 0 : i - 1)
        setSelected(today[next].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, today])

  // Задача, только что попавшая в «Сегодня», въезжает с анимацией.
  const landedId = useMemo(() => {
    const last = today[today.length - 1]
    if (last && last.id !== lastLanded.current) {
      lastLanded.current = last.id
      return last.id
    }
    return null
  }, [today])

  if (!ready) return null
  if (cloudEnabled && !signedIn) return <Auth />

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-30 border-b bg-surface/85 backdrop-blur-md"
        style={{ borderColor: 'var(--color-line)' }}
      >
        <div className="relative mx-auto flex w-full max-w-[1280px] items-center gap-2 px-3 py-2.5 sm:gap-5 sm:px-8">
          <span className="hidden shrink-0 text-[16px] font-semibold tracking-[-0.01em] sm:block">Пульс</span>

          <nav
            className="flex shrink-0 items-center gap-0.5 rounded-[10px] p-[3px]"
            style={{ backgroundColor: 'var(--color-sunken)' }}
          >
            {TABS.map(([id, label, key]) => {
              const on = screen === id
              return (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  title={`Клавиша ${key}`}
                  className="rounded-[7px] px-2 py-1 text-[13px] transition-colors sm:px-3 sm:text-[13.5px]"
                  style={{
                    fontWeight: on ? 500 : 400,
                    color: on ? 'var(--color-ink)' : 'var(--color-ink3)',
                    backgroundColor: on ? 'var(--color-surface)' : 'transparent',
                    boxShadow: on ? '0 1px 2px rgba(17,24,32,.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </nav>

          <div className="flex-1" />
          <SyncLine state={sync} pending={pending} error={syncError} />

          <button
            onClick={() => setOverlay('search')}
            className="btn btn-ghost btn-sm"
            aria-label="Поиск"
            title="Поиск  /"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
              <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M10.4 10.4 L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <DataMenu signedIn={signedIn} />
          <button
            onClick={() => setOverlay('help')}
            className="btn btn-ghost btn-sm hidden sm:inline-flex"
            aria-label="Клавиши"
            title="Клавиши  ?"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M5.8 6.1a2.2 2.2 0 1 1 2.7 2.15c-.4.1-.5.4-.5.75v.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="8" cy="12.1" r="0.95" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1280px] px-4 pt-5 sm:px-8">
        <QuickAdd
          projects={active}
          focusSignal={focusSignal}
          defaultProjectId={screen === 'project' ? projectId : null}
        />
      </div>

      <main className="pt-1">
        {screen === 'pulse' && (
          <PulseScreen
            projects={state.projects}
            tasks={state.tasks}
            warmedId={warmedProject?.id ?? null}
            landedId={landedId}
            selectedId={selected}
            onOpenProject={openProject}
          />
        )}
        {screen === 'project' && (
          <ProjectScreen
            projects={state.projects}
            tasks={state.tasks}
            currentId={projectId}
            onSelect={setProjectId}
          />
        )}
        {screen === 'week' && (
          <WeekScreen
            projects={state.projects}
            tasks={state.tasks}
            weekOffset={weekOffset}
            onShift={(n) => setWeekOffset((v) => (n === 0 ? 0 : v + n))}
          />
        )}
      </main>

      {overlay === 'help' && <Help onClose={() => setOverlay('none')} />}
      {overlay === 'search' && (
        <Search
          projects={state.projects}
          tasks={state.tasks}
          onClose={() => setOverlay('none')}
          onOpenProject={openProject}
        />
      )}
    </div>
  )
}
