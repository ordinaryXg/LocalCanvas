import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppConfig } from '../../types/config'
import type { SettingsFocus, SettingsTabId } from '../../stores/editorShellStore'
import { useT } from '../../i18n'
import {
  loadAgentPreferences,
  saveAgentPreferences,
  type AgentPreferences,
} from '../../utils/agentPreferences'
import { evaluateAgentReadiness } from '../../utils/agentReadiness'
import { getTemplateUnavailableReason } from '../../utils/agentTemplateAvailability'

interface SettingsAgentTabProps {
  config: AppConfig
  focus?: SettingsFocus
  onNavigateTab: (tab: SettingsTabId, focus?: SettingsFocus) => void
}

interface SkillRow {
  id: string
  name: string
  description: string
}

export function SettingsAgentTab({ config, focus, onNavigateTab }: SettingsAgentTabProps) {
  const t = useT()
  const readinessRef = useRef<HTMLDivElement>(null)
  const templatesRef = useRef<HTMLDivElement>(null)
  const prefsRef = useRef<HTMLDivElement>(null)
  const [prefs, setPrefs] = useState<AgentPreferences>(() => loadAgentPreferences())
  const [skills, setSkills] = useState<SkillRow[]>([])
  const readiness = evaluateAgentReadiness(config)

  useEffect(() => {
    void window.api.agent.listSkills().then((res) => setSkills(res.skills))
  }, [])

  useEffect(() => {
    if (!focus) return
    const target =
      focus === 'readiness'
        ? readinessRef.current
        : focus === 'templates'
          ? templatesRef.current
          : focus === 'prefs'
            ? prefsRef.current
            : null
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [focus])

  const updatePrefs = useCallback((patch: Partial<AgentPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch }
      saveAgentPreferences(next)
      return next
    })
  }, [])

  const rowLabel = (key: string) => {
    const i18nKey = `settings.agent.row.${key}`
    const translated = t(i18nKey)
    return translated === i18nKey ? key : translated
  }

  const statusIcon = (status: string) => {
    if (status === 'ok') return '✓'
    if (status === 'error') return '✗'
    if (status === 'warn') return '⚠'
    return '○'
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div
        ref={readinessRef}
        className="rounded-lg border border-border bg-bg-tertiary/50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-text-primary">{t('settings.agent.readinessTitle')}</h3>
          <span
            className={`text-xs ${readiness.ready ? 'text-success' : 'text-warning'}`}
          >
            {readiness.ready
              ? t('settings.agent.readinessReady')
              : t('settings.agent.readinessNeedsSetup')}
          </span>
        </div>
        {readiness.rows.map((row) => (
          <div
            key={row.id}
            className={`flex items-center justify-between gap-3 text-sm ${
              row.status === 'error' || row.status === 'warn' ? 'text-warning' : ''
            }`}
          >
            <span>
              {statusIcon(row.status)} {rowLabel(row.label)} — {row.value}
            </span>
            <button
              type="button"
              className="shrink-0 text-xs text-accent hover:underline"
              onClick={() => onNavigateTab(row.settingsTab, row.focus as SettingsFocus | undefined)}
            >
              {t('settings.agent.changeLink')}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <h3 className="text-sm font-medium text-text-primary">{t('settings.agent.plannerTitle')}</h3>
        <p className="text-xs text-text-muted">{t('settings.agent.plannerHint')}</p>
        <p className="text-sm text-text-primary">
          {config.llm_models.find((m) => m.id === config.settings.default_llm)?.name ??
            config.settings.default_llm ??
            '—'}
        </p>
        <button
          type="button"
          className="text-xs text-accent hover:underline"
          onClick={() => onNavigateTab('defaults', 'default_llm')}
        >
          {t('settings.agent.changeInDefaults')}
        </button>
      </div>

      <div ref={templatesRef} className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">{t('settings.agent.templatesTitle')}</h3>
        <p className="text-xs text-text-muted">{t('settings.agent.templatesHint')}</p>
        {skills.map((skill) => {
          const enabled = !prefs.disabledTemplateIds.includes(skill.id)
          const unavailable = getTemplateUnavailableReason(skill.id, config)
          return (
            <label
              key={skill.id}
              className={`flex items-start gap-3 py-2 ${unavailable ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={enabled}
                disabled={!!unavailable}
                onChange={(e) => {
                  const disabled = prefs.disabledTemplateIds.filter((id) => id !== skill.id)
                  if (!e.target.checked) disabled.push(skill.id)
                  updatePrefs({ disabledTemplateIds: disabled })
                }}
                className="mt-0.5"
              />
              <span className="flex-1 min-w-0">
                <span className="text-sm text-text-primary block">{skill.name}</span>
                <span className="text-[10px] text-text-muted block">{skill.description}</span>
                {unavailable && (
                  <span className="text-[10px] text-warning block">
                    {t(`settings.agent.unavailable.${unavailable}`)}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      <div ref={prefsRef} className="rounded-lg border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium text-text-primary">{t('settings.agent.prefsTitle')}</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.autoRunAfterConfirm}
            onChange={(e) => updatePrefs({ autoRunAfterConfirm: e.target.checked })}
          />
          {t('settings.agent.autoRun')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.checkpointEnabled}
            onChange={(e) => updatePrefs({ checkpointEnabled: e.target.checked })}
          />
          {t('settings.agent.checkpoint')}
        </label>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <h3 className="text-sm font-medium text-text-primary">{t('settings.agent.helpTitle')}</h3>
        <p className="text-xs text-text-muted">{t('settings.agent.helpHint')}</p>
      </div>
    </div>
  )
}
