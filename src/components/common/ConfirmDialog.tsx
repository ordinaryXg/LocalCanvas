import { useT } from '../../i18n'

interface ConfirmDialogProps {
  title: string
  message: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, onSave, onDiscard, onCancel }: ConfirmDialogProps) {
  const t = useT()

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60">
      <div className="bg-bg-secondary border border-border rounded-xl p-5 w-80 shadow-xl">
        <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-xs text-text-muted mb-4">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onSave}
            className="text-xs py-2 rounded bg-accent text-white"
          >
            {t('app.saveAndLeave')}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="text-xs py-2 rounded bg-bg-tertiary text-text-primary"
          >
            {t('app.discard')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs py-2 text-text-muted hover:text-white"
          >
            {t('app.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
