import { useT } from '../../i18n'
import type { AgentBriefDraft } from '../../utils/agentDraftStudio'

interface AgentBriefCardProps {
  brief: AgentBriefDraft
  confirmed: boolean
  onChange: (patch: Partial<AgentBriefDraft>) => void
  onConfirm: () => void
}

export function AgentBriefCard({ brief, confirmed, onChange, onConfirm }: AgentBriefCardProps) {
  const t = useT()

  return (
    <div className="rounded-lg border border-border bg-bg-tertiary/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium text-text-primary">{t('agent.briefTitle')}</h4>
        {confirmed && <span className="text-[10px] text-success">{t('agent.briefConfirmed')}</span>}
      </div>
      <div className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1.5 text-[10px]">
        <span className="text-text-muted">{t('agent.briefFilmType')}</span>
        <span className="text-text-primary">{brief.filmType}</span>

        <span className="text-text-muted">{t('agent.briefDuration')}</span>
        <input
          type="number"
          min={3}
          max={600}
          value={brief.durationSec ?? ''}
          disabled={confirmed}
          onChange={(e) =>
            onChange({ durationSec: e.target.value ? Number(e.target.value) : undefined })
          }
          className="bg-bg-tertiary border border-border rounded px-2 py-0.5 text-text-primary w-20"
        />

        <span className="text-text-muted">{t('agent.briefAspect')}</span>
        <select
          value={brief.aspectRatio ?? '16:9'}
          disabled={confirmed}
          onChange={(e) => onChange({ aspectRatio: e.target.value })}
          className="bg-bg-tertiary border border-border rounded px-2 py-0.5 text-text-primary w-24"
        >
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="1:1">1:1</option>
        </select>

        <span className="text-text-muted">{t('agent.briefTone')}</span>
        <input
          type="text"
          value={brief.tone}
          disabled={confirmed}
          onChange={(e) => onChange({ tone: e.target.value })}
          className="bg-bg-tertiary border border-border rounded px-2 py-0.5 text-text-primary"
        />

        <span className="text-text-muted">{t('agent.briefMustInclude')}</span>
        <p className="text-text-primary line-clamp-2">{brief.mustInclude}</p>
      </div>
      {!confirmed && (
        <button
          type="button"
          onClick={onConfirm}
          className="text-[10px] px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover"
        >
          {t('agent.briefConfirm')}
        </button>
      )}
    </div>
  )
}
