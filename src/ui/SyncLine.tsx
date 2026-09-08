import type { SyncState } from '../data/store'

/**
 * Индикатор — не плашка в углу, а сама линия под шапкой:
 * она всегда на виду, ничего не загораживает и меняет характер штриха.
 */
export function SyncLine({ state, pending, error }: { state: SyncState; pending: number; error: string }) {
  const look: Record<SyncState, { line: React.CSSProperties; label: string; color: string }> = {
    local: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, var(--color-ink4) 0 2px, transparent 2px 6px)' },
      label: 'только этот компьютер',
      color: 'var(--color-ink3)',
    },
    signedout: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, var(--color-ink4) 0 2px, transparent 2px 6px)' },
      label: 'вход не выполнен',
      color: 'var(--color-ink3)',
    },
    saving: {
      line: {
        backgroundImage:
          'repeating-linear-gradient(to right, var(--color-deep) 0 8px, transparent 8px 16px)',
        backgroundSize: '16px 100%',
        animation: 'syncmove 900ms linear infinite',
      },
      label: 'сохраняю',
      color: 'var(--color-deep)',
    },
    saved: {
      line: { backgroundColor: 'var(--color-deep)' },
      label: 'сохранено',
      color: 'var(--color-deep)',
    },
    offline: {
      line: {
        backgroundImage:
          'repeating-linear-gradient(to right, var(--color-hay) 0 5px, transparent 5px 10px)',
      },
      label: pending ? `нет сети — ${pending} изм. ждут` : 'нет сети',
      color: 'var(--color-hay)',
    },
    error: {
      line: {
        backgroundImage:
          'repeating-linear-gradient(to right, var(--color-warm) 0 14px, transparent 14px 20px)',
      },
      label: 'ошибка синхронизации',
      color: 'var(--color-warm)',
    },
  }

  const l = look[state]

  return (
    <>
      <span className="eyebrow whitespace-nowrap" style={{ color: l.color }} title={error || undefined}>
        {l.label}
      </span>
      <div className="absolute inset-x-0 bottom-0 h-[2px]" style={l.line} aria-hidden />
    </>
  )
}
