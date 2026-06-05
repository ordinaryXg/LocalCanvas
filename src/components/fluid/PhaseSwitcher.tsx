import type { FluidPhase } from '../../types/fluid'

const phases: { id: FluidPhase; label: string }[] = [
  { id: 'explore', label: '探索' },
  { id: 'converge', label: '收敛' },
  { id: 'freeze', label: '冻结' },
]

export function PhaseSwitcher({
  phase,
  onSelect,
}: {
  phase: FluidPhase
  onSelect: (p: FluidPhase) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-bg-secondary p-1 text-xs">
      {phases.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={`px-2 py-1 rounded ${phase === p.id ? 'bg-violet-600 text-white' : 'text-text-muted hover:text-white'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
