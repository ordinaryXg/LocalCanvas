import { useState } from 'react'
import { useT } from '../../i18n'
import { useUserStore } from '../../stores/userStore'
import { handleError } from '../../utils/ErrorHandler'

interface LoginFormProps {
  onSwitchRegister: () => void
  onSuccess?: () => void
}

export function LoginForm({ onSwitchRegister, onSuccess }: LoginFormProps) {
  const t = useT()
  const setAuth = useUserStore((s) => s.setAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await window.api.auth.login({ username, password })
      if ('error' in result && result.error) {
        setError(result.message ?? t('auth.loginFailed'))
        return
      }
      setAuth(result.user ?? null, result.isGuest)
      onSuccess?.()
    } catch (err) {
      handleError(err, 'login')
      setError(t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('auth.username')}</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('auth.password')}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full py-2 rounded bg-accent text-white text-sm disabled:opacity-50"
      >
        {loading ? t('auth.loggingIn') : t('auth.login')}
      </button>
      <button type="button" onClick={onSwitchRegister} className="w-full text-xs text-text-muted hover:text-accent">
        {t('auth.switchRegister')}
      </button>
    </form>
  )
}
