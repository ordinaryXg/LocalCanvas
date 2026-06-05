import { useState, useEffect } from 'react'
import { useT } from '../../i18n'

interface AboutDialogProps {
  onClose: () => void
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const t = useT()
  const [version, setVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [downloadPct, setDownloadPct] = useState(0)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    void window.api.app.getVersion().then(setVersion)

    const unsubAvailable = window.api.on('update:available', (...args: unknown[]) => {
      const info = args[0] as { version: string }
      setUpdateStatus(`${t('about.updateAvailable')}: v${info.version}`)
    })
    const unsubProgress = window.api.on('update:progress', (...args: unknown[]) => {
      const p = args[0] as { percentage: number }
      setDownloadPct(Math.round(p.percentage))
    })
    const unsubDownloaded = window.api.on('update:downloaded', () => {
      setDownloaded(true)
    })
    const unsubError = window.api.on('update:error', (...args: unknown[]) => {
      const e = args[0] as { error: string }
      setUpdateStatus(e.error)
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [t])

  const handleCheckUpdate = async () => {
    setUpdateStatus(null)
    setDownloaded(false)
    try {
      const result = await window.api.update.check()
      if (result.hasUpdate && result.version) {
        setUpdateStatus(`${t('about.updateAvailable')}: v${result.version}`)
      } else {
        setUpdateStatus(t('about.upToDate'))
      }
    } catch {
      setUpdateStatus(t('about.upToDate'))
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-border rounded-xl p-6 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-text-primary mb-1">{t('about.title')}</h2>
        <p className="text-xs text-text-muted mb-4">
          {t('about.version')}: {version || '…'}
        </p>

        {updateStatus && <p className="text-xs text-text-secondary mb-3">{updateStatus}</p>}
        {downloadPct > 0 && downloadPct < 100 && (
          <p className="text-xs text-text-muted mb-3">
            {t('about.downloading')}: {downloadPct}%
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleCheckUpdate()}
            className="flex-1 text-xs py-2 rounded bg-bg-tertiary text-text-primary hover:bg-accent/20"
          >
            {t('about.checkUpdate')}
          </button>
          {updateStatus?.includes(t('about.updateAvailable')) && !downloaded && (
            <button
              type="button"
              onClick={() => void window.api.update.download()}
              className="flex-1 text-xs py-2 rounded bg-accent text-white"
            >
              {t('about.downloading')}
            </button>
          )}
          {downloaded && (
            <button
              type="button"
              onClick={() => void window.api.update.install()}
              className="flex-1 text-xs py-2 rounded bg-accent text-white"
            >
              {t('about.restart')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-3 text-xs py-2 text-text-muted hover:text-white"
        >
          {t('app.cancel')}
        </button>
      </div>
    </div>
  )
}
