import { useState } from 'react'
import { sendMagicLink } from '../data/store'

/** Вход одной ссылкой на почту. Паролей нет. */
export function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setErr('')
    try {
      await sendMagicLink(email.trim())
      setSent(true)
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-[420px]">
        <div className="flex items-end gap-2 pb-2">
          <span className="text-[26px] leading-none" style={{ fontWeight: 300, letterSpacing: '0.02em' }}>
            Пульс
          </span>
          <span className="eyebrow pb-1">ведомость проектов</span>
        </div>
        <div className="h-px w-full" style={{ backgroundColor: 'var(--color-ink3)' }} />

        {sent ? (
          <div className="pt-5">
            <p className="text-[15px]" style={{ fontWeight: 300 }}>
              Ссылка ушла на <span className="num text-[13px]">{email}</span>.
            </p>
            <p className="pt-2 text-[13px] text-ink2">
              Открой письмо на этом компьютере — вернёшься сюда уже внутри. Ссылка живёт час.
            </p>
            <button onClick={() => setSent(false)} className="eyebrow mt-4 border border-rule px-2 py-1.5 hover:bg-card">
              другая почта
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="pt-5">
            <label className="eyebrow block pb-1.5">почта</label>
            <div className="flex">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="почта@пример.ру"
                className="num h-[40px] flex-1 border border-rule bg-card px-3 text-[13px] outline-none placeholder:text-ink4"
              />
              <button
                type="submit"
                disabled={busy}
                className="eyebrow h-[40px] border border-l-0 px-4 disabled:opacity-40"
                style={{ borderColor: 'var(--color-rule)', backgroundColor: 'var(--color-deep)', color: 'var(--color-card)' }}
              >
                {busy ? 'отправляю' : 'прислать ссылку'}
              </button>
            </div>
            <p className="pt-3 text-[12.5px] text-ink2">
              Пароля нет: на почту придёт ссылка, по ней и заходишь. Один раз с компьютера — дальше не спросит.
            </p>
            {err && <p className="pt-2 text-[12.5px]" style={{ color: 'var(--color-warm)' }}>{err}</p>}
          </form>
        )}
      </div>
    </main>
  )
}
