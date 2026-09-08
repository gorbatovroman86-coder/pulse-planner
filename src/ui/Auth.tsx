import { useEffect, useState } from 'react'
import { explainAuthError, readAuthError, sendMagicLink } from '../data/store'

/** Вход без пароля: ссылка на почту. Ошибки показываются, а не глотаются. */
export function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Ссылка вернулась с ошибкой — сказать об этом, а не показывать пустую форму.
  useEffect(() => {
    const e = readAuthError()
    if (e) setErr(explainAuthError(e))
  }, [])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setErr('')
    try {
      await sendMagicLink(email.trim())
      setSent(true)
    } catch (e2) {
      setErr(explainAuthError(e2 instanceof Error ? e2.message : String(e2)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="pb-5 text-center">
          <div className="text-[24px] font-semibold tracking-[-0.01em]">Пульс</div>
          <div className="pt-1 text-[14px] text-ink3">Проекты, которые нельзя терять из виду</div>
        </div>

        <div className="card p-6">
          {sent ? (
            <>
              <p className="text-[15px] leading-relaxed">
                Ссылка ушла на <span className="num text-[13.5px] font-medium">{email}</span>
              </p>
              <p className="pt-2 text-[13.5px] leading-relaxed text-ink2">
                Открой письмо и нажми ссылку — вернёшься сюда уже внутри. Она одноразовая и живёт час.
              </p>
              <div className="flex flex-wrap gap-2 pt-4">
                <button
                  disabled={busy}
                  onClick={(e) => void send(e as unknown as React.FormEvent)}
                  className="btn btn-quiet"
                >
                  Прислать ещё раз
                </button>
                <button
                  onClick={() => {
                    setSent(false)
                    setErr('')
                  }}
                  className="btn btn-ghost"
                >
                  Другая почта
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={send}>
              <label htmlFor="mail" className="label block pb-1.5">
                Почта
              </label>
              <input
                id="mail"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="почта@пример.ру"
                className="field w-full text-[14px] placeholder:text-ink4"
              />
              <button type="submit" disabled={busy} className="btn btn-primary mt-3 w-full justify-center">
                {busy ? 'Отправляю…' : 'Прислать ссылку для входа'}
              </button>
              <p className="pt-3 text-[13px] leading-relaxed text-ink3">
                Пароля нет: на почту придёт ссылка, по ней и заходишь. Один раз с компьютера —
                дальше не спросит.
              </p>
            </form>
          )}

          {err && (
            <p
              className="mt-4 rounded-lg px-3 py-2.5 text-[13px] leading-relaxed"
              style={{ backgroundColor: 'var(--color-alarm-soft)', color: 'var(--color-alarm)' }}
            >
              {err}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
