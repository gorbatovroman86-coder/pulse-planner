import type { SyncState } from '../data/store'

/**
 * Индикатор — не плашка в углу, а сама линия под шапкой:
 * она всегда на виду, ничего не загораживает и меняет характер штриха.
 */
export function SyncLine({ state, pending, error }: { state: SyncState; pending: number; error: string }) {
  const look: Record<SyncState, { line: React.CSSProperties; label: string; color: string; dot: string }> = {
    local: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, var(--color-ink4) 0 2px, transparent 2px 6px)' },
      label: 'только этот компьютер',
      color: 'var(--color-ink3)',
      dot: 'var(--color-ink4)',
    },
    signedout: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, var(--color-ink4) 0 2px, transparent 2px 6px)' },
      label: 'вход не выполнен',
      color: 'var(--color-ink3)',
      dot: 'var(--color-ink4)',
    },
    saving: {
      line: {
        backgroundImage: 'repeating-linear-gradient(to right, var(--color-accent) 0 8px, transparent 8px 16px)',
        backgroundSize: '16px 100%',
        animation: 'syncmove 900ms linear infinite',
      },
      label: 'сохраняю',
      color: 'var(--color-ink2)',
      dot: 'var(--color-accent)',
    },
    saved: {
      line: { backgroundColor: 'var(--color-accent)' },
      label: 'сохранено',
      color: 'var(--color-ink2)',
      dot: 'var(--color-accent)',
    },
    offline: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, #B45309 0 5px, transparent 5px 10px)' },
      label: pending ? `нет сети · ${pending} ждут` : 'нет сети',
      color: '#B45309',
      dot: '#B45309',
    },
    error: {
      line: { backgroundImage: 'repeating-linear-gradient(to right, var(--color-alarm) 0 14px, transparent 14px 20px)' },
      label: 'ошибка синхронизации',
      color: 'var(--color-alarm)',
      dot: 'var(--color-alarm)',
    },
  }

  const l = look[state]

  return (
    <>
      <span
        className="hidden items-center gap-1.5 whitespace-nowrap text-[12.5px] sm:flex"
        style={{ color: l.color }}
        title={error || undefined}
      >
        <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: l.dot }} />
        {l.label}
      </span>
      <div className="absolute inset-x-0 bottom-0 h-[2px]" style={l.line} aria-hidden />
    </>
  )
}
