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
    <div className="mt-2 space-y-2">
      <div className="text-[10px] text-text-muted">{title}</div>
      {items.map((tpl) => {
        const unavailable = config ? getTemplateUnavailableReason(tpl.id, config) : undefined
        const blocked = !!unavailable
        return (
          <div
            key={tpl.id}
            className={`p-2.5 rounded-lg border border-border hover:border-accent/50 transition ${
              blocked ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-text-primary">{tpl.name}</div>
                <div className="text-[10px] text-text-muted">{tpl.description}</div>
                {tpl.score > 0 && (
                  <div className="mt-1 h-1 rounded bg-bg-tertiary overflow-hidden">
                    <div
                      className="h-full bg-accent/70"
                      style={{ width: `${tpl.score}%` }}
                    />
                  </div>
                )}
                {blocked && (
                  <div className="text-[10px] text-warning mt-1">
                    {t(`settings.agent.unavailable.${unavailable}`)}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={disabled || blocked}
                onClick={() => onAdopt(tpl.id)}
                className="shrink-0 text-[10px] px-2 py-1 rounded bg-accent text-white disabled:opacity-50"
              >
                {t('agent.templateAdopt')}
              </button>
            </div>
          </div>
        )
      })}
      {templates.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={onSkip}
          className="text-[10px] text-text-muted hover:text-accent underline disabled:opacity-50"
        >
          {t('agent.templateSkip')}
        </button>
      )}
    </div>
  )
}
