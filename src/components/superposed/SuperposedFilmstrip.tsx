import type { ShotCandidate } from '../../types/fluid'

export function SuperposedFilmstrip({
  candidates,
  onSelect,
  onArchive,
}: {
  candidates: ShotCandidate[]
  onSelect: (id: string) => void
  onArchive: (id: string) => void
}) {
  if (candidates.length <= 1) return null
  return (
    <div className="flex gap-1 mt-2 overflow-x-auto">
      {candidates.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={`relative shrink-0 w-12 h-7 rounded border text-[9px] ${
            c.isPrimary ? 'border-white opacity-100' : 'border-border opacity-35 animate-pulse'
          }`}
          title={c.promptSnapshot}
        >
          {c.isPrimary ? '主' : '鬼'}
          {!c.isPrimary && (
            <span
              role="button"
              className="absolute -top-1 -right-1 text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                onArchive(c.id)
              }}
            >
              ×
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
