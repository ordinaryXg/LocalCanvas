export type StatusChipTone = 'default' | 'accent' | 'warn' | 'error' | 'success'

export interface StatusChip {
  label: string
  tone?: StatusChipTone
  onClick?: () => void
}

const TONE_CLASS: Record<StatusChipTone, string> = {
  default: 'border-border text-text-muted bg-bg-tertiary/40',
  accent: 'border-[var(--studio-accent)]/50 text-[var(--studio-accent)] bg-[var(--studio-accent-muted)]/30',
  warn: 'border-amber-500/40 text-amber-200 bg-amber-500/10',
  error: 'border-danger/40 text-danger bg-danger/10',
  success: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
}

interface Props {
  chips: StatusChip[]
}

export function InspectorStatusChips({ chips }: Props) {
  const visible = chips.filter((c) => c.label)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((chip) => {
        const tone = chip.tone ?? 'default'
        const className = `text-[10px] px-2 py-0.5 rounded-full border ${TONE_CLASS[tone]} ${
          chip.onClick ? 'cursor-pointer hover:opacity-90' : ''
        }`
        if (chip.onClick) {
          return (
            <button key={chip.label} type="button" onClick={chip.onClick} className={className}>
              {chip.label}
            </button>
          )
        }
        return (
          <span key={chip.label} className={className}>
            {chip.label}
          </span>
        )
      })}
    </div>
  )
}
