import { useEffect, useState } from 'react'
import { useUserStore } from '../../stores/userStore'
import { handleError, showToast } from '../../utils/ErrorHandler'

interface Props {
  onClose: () => void
}

export function UserProfilePanel({ onClose }: Props) {
  const user = useUserStore((s) => s.user)
  const setAuth = useUserStore((s) => s.setAuth)
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDisplayName(user?.displayName ?? '')
    setEmail(user?.email ?? '')
  }, [user?.displayName, user?.email])

  if (!user) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await window.api.user.updateProfile({
        displayName: displayName.trim() || undefined,
        email: email.trim() || undefined,
      })
      if (result.user) {
        const session = await window.api.auth.getSession()
        setAuth(session.user, session.isGuest)
        showToast('资料已保存', 'info')
        onClose()
      } else if (result.message) {
        showToast(result.message, 'error')
      }
    } catch (err) {
      handleError(err, 'updateProfile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-label="账号资料"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--studio-border)] bg-bg-secondary p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">账号资料</h2>
          <button type="button" onClick={onClose} className="text-text-muted text-sm hover:text-white">
            ✕
          </button>
        </div>
        <p className="text-[10px] text-text-muted mb-3">@{user.username}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-text-muted">昵称</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full mt-1 bg-bg-tertiary text-text-primary text-sm px-2 py-1.5 rounded border border-border outline-none focus:border-[var(--studio-accent)]"
              placeholder="显示名称"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-muted">邮箱（可选）</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full mt-1 bg-bg-tertiary text-text-primary text-sm px-2 py-1.5 rounded border border-border outline-none focus:border-[var(--studio-accent)]"
              placeholder="email@example.com"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted border border-border rounded hover:text-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-1.5 text-xs bg-[var(--studio-accent)] text-white rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
