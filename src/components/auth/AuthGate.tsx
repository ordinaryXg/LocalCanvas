import { useState } from 'react'
import { useT } from '../../i18n'
import { useUserStore } from '../../stores/userStore'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

interface AuthGateProps {
  children: React.ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const t = useT()
  const { authReady, isGuest } = useUserStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [dismissed, setDismissed] = useState(false)

  if (!authReady) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg-primary text-text-muted text-sm">
        {t('auth.loading')}
      </div>
    )
  }

  if (!isGuest || dismissed) {
    return <>{children}</>
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-sm bg-bg-secondary border border-border rounded-xl p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-text-primary mb-1">{t('auth.welcome')}</h1>
        <p className="text-xs text-text-muted mb-4">{t('auth.welcomeHint')}</p>
        {mode === 'login' ? (
          <LoginForm onSwitchRegister={() => setMode('register')} onSuccess={() => setDismissed(true)} />
        ) : (
          <RegisterForm onSwitchLogin={() => setMode('login')} onSuccess={() => setDismissed(true)} />
        )}
        <button
          type="button"
          onClick={() =>
            void window.api.auth.enterGuest().then((r) => {
              useUserStore.getState().setAuth(r.user, r.isGuest)
              setDismissed(true)
            })
          }
          className="w-full mt-4 py-2 text-xs text-text-muted hover:text-text-primary border border-border rounded"
        >
          {t('auth.continueGuest')}
        </button>
      </div>
    </div>
  )
}
