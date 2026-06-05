import { useState } from 'react'
import { useT } from '../../i18n'
import { useUserStore } from '../../stores/userStore'
import { handleError } from '../../utils/ErrorHandler'

interface RegisterFormProps {
  onSwitchLogin: () => void
  onSuccess?: () => void
}

export function RegisterForm({ onSwitchLogin, onSuccess }: RegisterFormProps) {
  const t = useT()
  const setAuth = useUserStore((s) => s.setAuth)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await window.api.auth.register({ username, password })
      if ('error' in result && result.error) {
        const msg =
          result.error === 'USERNAME_TAKEN'
            ? t('auth.usernameTaken')
            : result.error === 'PASSWORD_TOO_SHORT'
              ? t('auth.passwordTooShort')
              : (result.message ?? t('auth.registerFailed'))
        setError(msg)
        return
      }
      setAuth(result.user ?? null, result.isGuest)
      onSuccess?.()
    } catch (err) {
      handleError(err, 'register')
      setError(t('auth.registerFailed'))
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
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="text-xs text-text-muted block mb-1">{t('auth.confirmPassword')}</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !username || !password}
        className="w-full py-2 rounded bg-accent text-white text-sm disabled:opacity-50"
      >
        {loading ? t('auth.registering') : t('auth.register')}
      </button>
      <button type="button" onClick={onSwitchLogin} className="w-full text-xs text-text-muted hover:text-accent">
        {t('auth.switchLogin')}
      </button>
    </form>
  )
}
