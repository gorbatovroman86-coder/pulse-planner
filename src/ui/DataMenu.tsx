import { useEffect, useRef, useState } from 'react'
import type { Snapshot } from '../types'
import { exportSnapshot, importSnapshot, refresh } from '../data/store'
import { cloudEnabled } from '../data/cloud'
import { signOut } from '../data/store'

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function DataMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  // Esc закрывает меню: иначе за экраном остаётся невидимая подложка.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function doExport() {
    const snap = exportSnapshot()
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `puls-${stamp()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg(`Сохранено ${snap.projects.length} проектов и ${snap.tasks.length} задач.`)
  }

  async function doImport(f: File) {
    try {
      const snap = JSON.parse(await f.text()) as Snapshot
      if (!Array.isArray(snap.projects) || !Array.isArray(snap.tasks)) {
        throw new Error('в файле нет полей projects и tasks')
      }
      importSnapshot(snap, 'replace')
      setMsg(`Восстановлено ${snap.projects.length} проектов и ${snap.tasks.length} задач.`)
    } catch (e) {
      setMsg(`Не вышло: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-quiet btn-sm"
        aria-expanded={open}
      >
        данные
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-[26px] z-40 w-[290px] border bg-surface p-3 flip-in"
            style={{ borderColor: 'var(--color-ink3)' }}
          >
            <p className="text-[12.5px] text-ink2 pb-2">
              Ручная копия на случай, если с облаком что-то случится. Формат тот же, что у ночного бэкапа.
            </p>
            <div className="flex flex-col gap-1.5">
              <button onClick={doExport} className="label border border-line px-2 py-1.5 text-left hover:bg-sunken">
                экспорт в JSON — скачать файл
              </button>
              <button
                onClick={() => file.current?.click()}
                className="label border border-line px-2 py-1.5 text-left hover:bg-sunken"
              >
                импорт из JSON — заменить данные
              </button>
              {cloudEnabled && signedIn && (
                <>
                  <button
                    onClick={() => void refresh()}
                    className="label border border-line px-2 py-1.5 text-left hover:bg-sunken"
                  >
                    подтянуть из облака сейчас
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="btn btn-ghost w-full justify-start"
                  >
                    выйти
                  </button>
                </>
              )}
            </div>
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void doImport(f)
                e.target.value = ''
              }}
            />
            {msg && <p className="pt-2 text-[12px]" style={{ color: 'var(--color-accent)' }}>{msg}</p>}
          </div>
        </>
      )}
    </div>
  )
}
