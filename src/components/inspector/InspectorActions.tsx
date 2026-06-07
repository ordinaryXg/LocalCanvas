interface Props {
  label: string
  onClick: () => void
  variant?: 'primary' | 'edit'
  disabled?: boolean
}

export function InspectorActions({ label, onClick, variant = 'primary', disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-1.5 rounded-lg text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: variant === 'edit' ? 'var(--mode-edit)' : 'var(--studio-accent-muted)',
      }}
    >
      {label}
    </button>
  )
}
