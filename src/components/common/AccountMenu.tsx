import { useState } from 'react'
import { UserProfilePanel } from './UserProfilePanel'
import { useT } from '../../i18n'
import { useUserStore } from '../../stores/userStore'

export function AccountMenu() {
  const t = useT()
  const { user, isGuest, setAuth } = useUserStore()
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const label = isGuest ? t('auth.guest') : (user?.displayName ?? user?.username ?? t('auth.user'))

  const handleLogout = async () => {
    const result = await window.api.auth.logout()
    setAuth(result.user, result.isGuest)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-tertiary text-xs text-text-primary"
      >
        <span className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-[10px]">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[80px] truncate">{label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
            {!isGuest && user && (
              <div className="px-3 py-2 text-[10px] text-text-muted border-b border-border">
                @{user.username}
              </div>
            )}
            {!isGuest && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(true)
                    setOpen(false)
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-tertiary text-text-primary"
                >
                  账号资料
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-tertiary text-text-primary"
                >
                  {t('auth.logout')}
                </button>
              </>
            )}
            {isGuest && (
              <div className="px-3 py-2 text-[10px] text-text-muted">{t('auth.guestHint')}</div>
            )}
          </div>
        </>
      )}
      {profileOpen && <UserProfilePanel onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
