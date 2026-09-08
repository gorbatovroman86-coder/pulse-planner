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
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-[2px]">
        <div className="relative mx-auto flex w-full max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 sm:h-[46px] sm:flex-nowrap sm:gap-5 sm:px-6 sm:py-0">
          <span className="text-[17px] leading-none" style={{ fontWeight: 400, letterSpacing: '0.03em' }}>
            Пульс
          </span>

          <nav className="flex items-center gap-1">
            {TABS.map(([id, label, key]) => (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className="group flex items-baseline gap-1.5 px-2 py-1"
                style={{
                  color: screen === id ? 'var(--color-ink)' : 'var(--color-ink3)',
                  boxShadow: screen === id ? 'inset 0 -2px 0 var(--color-ink)' : 'none',
                }}
              >
                <span className="text-[13.5px]" style={{ fontWeight: screen === id ? 500 : 350 }}>
                  {label}
                </span>
                <span className="num text-[10px] text-ink4">{key}</span>
              </button>
            ))}
          </nav>

          <div className="hidden flex-1 sm:block" />
          <SyncLine state={sync} pending={pending} error={syncError} />
          <div className="flex-1 sm:hidden" />
          <button
            onClick={() => setOverlay('search')}
            className="eyebrow border border-rule px-2 py-1 hover:bg-card"
          >
            поиск<span className="hidden sm:inline"> /</span>
          </button>
          <DataMenu signedIn={signedIn} />
          <button onClick={() => setOverlay('help')} className="eyebrow border border-rule px-2 py-1 hover:bg-card">
            ?
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1360px] px-4 pt-4 sm:px-6">
        <QuickAdd
          projects={active}
          focusSignal={focusSignal}
          defaultProjectId={screen === 'project' ? projectId : null}
        />
      </div>

      <main className="pt-2">
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
