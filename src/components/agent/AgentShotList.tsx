import { useState } from 'react'
import { useT } from '../../i18n'
import type { AgentShotDraft } from '../../utils/agentDraftStudio'

interface AgentShotListProps {
  shots: AgentShotDraft[]
}

const VISIBLE_COLLAPSED = 3

export function AgentShotList({ shots }: AgentShotListProps) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const totalSec = shots.reduce((sum, s) => sum + s.durationSec, 0)
  const visible = expanded ? shots : shots.slice(0, VISIBLE_COLLAPSED)
  const hidden = shots.length - VISIBLE_COLLAPSED

  return (
    <div className="rounded-lg border border-border bg-bg-tertiary/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-text-primary">
          {t('agent.shotListTitle').replace('{{count}}', String(shots.length)).replace('{{sec}}', String(totalSec))}
        </h4>
        {shots.length > VISIBLE_COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] text-accent hover:underline"
          >
            {expanded ? t('agent.shotListCollapse') : t('agent.shotListExpand')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-[20px_48px_32px_28px_1fr] gap-x-1 gap-y-1 text-[10px] text-text-muted font-medium">
        <span>#</span>
        <span>Beat</span>
        <span>{t('agent.shotDuration')}</span>
        <span>{t('agent.shotMode')}</span>
        <span>{t('agent.shotSummary')}</span>
      </div>
      {visible.map((shot) => (
        <div
          key={shot.sequence}
          className="grid grid-cols-[20px_48px_32px_28px_1fr] gap-x-1 gap-y-0 text-[10px] text-text-primary"
        >
          <span className="tabular-nums text-text-muted">{shot.sequence}</span>
          <span className="uppercase text-accent truncate">{shot.beat}</span>
          <span className="text-text-muted">{shot.durationSec}s</span>
          <span className="text-text-muted">{shot.mode}</span>
          <span className="truncate">{shot.summary}</span>
        </div>
      ))}
      {!expanded && hidden > 0 && (
        <p className="text-[10px] text-text-muted">
          {t('agent.shotListMore').replace('{{n}}', String(hidden))}
        </p>
      )}
    </div>
  )
}
