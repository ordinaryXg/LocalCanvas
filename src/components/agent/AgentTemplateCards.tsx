import { useEffect, useState } from 'react'
import type { AppConfig } from '../../types/config'
import type { SuggestedTemplate } from '../../types/agent'
import { useT } from '../../i18n'
import { getTemplateUnavailableReason } from '../../utils/agentTemplateAvailability'

interface AgentTemplateCardsProps {
  templates: SuggestedTemplate[]
  config: AppConfig | null
  onAdopt: (templateId: string) => void
  onSkip: () => void
  disabled?: boolean
}

export function AgentTemplateCards({
  templates,
  config,
  onAdopt,
  onSkip,
  disabled,
}: AgentTemplateCardsProps) {
  const t = useT()
  const [quickSkills, setQuickSkills] = useState<SuggestedTemplate[]>([])

  useEffect(() => {
    if (templates.length > 0) return
    void window.api.agent.listSkills().then((res) => {
      setQuickSkills(
        res.skills.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          score: 0,
        })),
      )
    })
  }, [templates.length])

  const items = templates.length > 0 ? templates : quickSkills
  if (items.length === 0) return null

  const title =
    templates.length > 0 ? t('agent.templatesRecommend') : t('agent.templatesQuick')

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-muted">{title}</span>
        {templates.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={onSkip}
            className="text-[10px] text-text-muted hover:text-accent underline disabled:opacity-50 shrink-0"
          >
            {t('agent.templateSkip')}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((tpl) => {
          const unavailable = config ? getTemplateUnavailableReason(tpl.id, config) : undefined
          const blocked = !!unavailable
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled || blocked}
              onClick={() => onAdopt(tpl.id)}
              title={blocked ? t(`settings.agent.unavailable.${unavailable}`) : tpl.description}
              className={`inline-flex items-center gap-1 max-w-full px-2 py-1 rounded-md border text-[10px] transition ${
                blocked
                  ? 'border-border/50 text-text-muted opacity-50 cursor-not-allowed'
                  : 'border-border text-text-primary hover:border-accent/60 hover:bg-accent/10'
              }`}
            >
              <span className="font-medium truncate">{tpl.name}</span>
              {tpl.score > 0 && (
                <span className="text-[9px] text-accent shrink-0">{tpl.score}%</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
