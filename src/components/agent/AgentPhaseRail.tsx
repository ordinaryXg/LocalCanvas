import { useT } from '../../i18n'
import type { PhaseRailItem } from '../../utils/agentPhaseState'

interface AgentPhaseRailProps {
  phases: PhaseRailItem[]
}

const statusClass: Record<PhaseRailItem['status'], string> = {
  done: 'text-success',
  active: 'text-accent',
  waiting: 'text-warning',
  pending: 'text-text-muted',
}

const statusMark: Record<PhaseRailItem['status'], string> = {
  done: '✓',
  active: '●',
  waiting: '◐',
  pending: '○',
}

export function AgentPhaseRail({ phases }: AgentPhaseRailProps) {
  const t = useT()

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max text-[9px]">
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex items-center gap-2">
            <span className={`whitespace-nowrap ${statusClass[phase.status]}`}>
              {t(phase.labelKey)} {statusMark[phase.status]}
            </span>
            {index < phases.length - 1 && (
              <span className="text-text-muted" aria-hidden>
                —
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
