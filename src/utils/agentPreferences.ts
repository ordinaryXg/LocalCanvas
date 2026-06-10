export interface AgentPreferences {
  version: 1
  disabledTemplateIds: string[]
  defaultMode: 'auto' | 'plan' | 'build'
  autoRunAfterConfirm: boolean
  checkpointEnabled: boolean
  defaultTrack: 'auto' | 'lite' | 'studio'
  takesPerShot: number
}

export const AGENT_PREFERENCES_KEY = 'lc-agent-preferences'

const LEGACY_DISABLED_SKILLS = 'lc-agent-disabled-skills'
const LEGACY_DISABLED_TEMPLATES = 'lc-agent-disabled-templates'
const LEGACY_DEFAULT_MODE = 'lc-agent-default-mode'
const LEGACY_AUTO_RUN = 'lc-agent-auto-run'
const LEGACY_CHECKPOINT = 'lc-agent-checkpoint-enabled'

export const DEFAULT_AGENT_PREFERENCES: AgentPreferences = {
  version: 1,
  disabledTemplateIds: [],
  defaultMode: 'auto',
  autoRunAfterConfirm: true,
  checkpointEnabled: true,
  defaultTrack: 'auto',
  takesPerShot: 1,
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function readLegacyDisabledIds(): string[] {
  const templates = parseStringArray(localStorage.getItem(LEGACY_DISABLED_TEMPLATES))
  if (templates.length > 0) return templates
  return parseStringArray(localStorage.getItem(LEGACY_DISABLED_SKILLS))
}

function readLegacyMode(): AgentPreferences['defaultMode'] {
  const raw = localStorage.getItem(LEGACY_DEFAULT_MODE)
  if (raw === 'plan' || raw === 'build' || raw === 'auto') return raw
  return DEFAULT_AGENT_PREFERENCES.defaultMode
}

function readLegacyBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key)
  if (raw === 'false') return false
  if (raw === 'true') return true
  return fallback
}

function removeLegacyKeys(): void {
  localStorage.removeItem(LEGACY_DISABLED_SKILLS)
  localStorage.removeItem(LEGACY_DISABLED_TEMPLATES)
  localStorage.removeItem(LEGACY_DEFAULT_MODE)
  localStorage.removeItem(LEGACY_AUTO_RUN)
  localStorage.removeItem(LEGACY_CHECKPOINT)
}

function normalizePreferences(raw: Partial<AgentPreferences>): AgentPreferences {
  const takes = raw.takesPerShot ?? DEFAULT_AGENT_PREFERENCES.takesPerShot
  return {
    version: 1,
    disabledTemplateIds: Array.isArray(raw.disabledTemplateIds)
      ? raw.disabledTemplateIds.filter((x): x is string => typeof x === 'string')
      : [],
    defaultMode:
      raw.defaultMode === 'plan' || raw.defaultMode === 'build' || raw.defaultMode === 'auto'
        ? raw.defaultMode
        : DEFAULT_AGENT_PREFERENCES.defaultMode,
    autoRunAfterConfirm:
      typeof raw.autoRunAfterConfirm === 'boolean'
        ? raw.autoRunAfterConfirm
        : DEFAULT_AGENT_PREFERENCES.autoRunAfterConfirm,
    checkpointEnabled:
      typeof raw.checkpointEnabled === 'boolean'
        ? raw.checkpointEnabled
        : DEFAULT_AGENT_PREFERENCES.checkpointEnabled,
    defaultTrack:
      raw.defaultTrack === 'lite' || raw.defaultTrack === 'studio' || raw.defaultTrack === 'auto'
        ? raw.defaultTrack
        : DEFAULT_AGENT_PREFERENCES.defaultTrack,
    takesPerShot: Math.min(3, Math.max(1, Math.round(takes))),
  }
}

export function loadAgentPreferences(): AgentPreferences {
  try {
    const raw = localStorage.getItem(AGENT_PREFERENCES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AgentPreferences>
      return normalizePreferences(parsed)
    }
  } catch {
    /* fall through to migration */
  }

  const migrated = normalizePreferences({
    disabledTemplateIds: readLegacyDisabledIds(),
    defaultMode: readLegacyMode(),
    autoRunAfterConfirm: readLegacyBool(LEGACY_AUTO_RUN, true),
    checkpointEnabled: readLegacyBool(LEGACY_CHECKPOINT, true),
  })
  saveAgentPreferences(migrated)
  removeLegacyKeys()
  return migrated
}

export function saveAgentPreferences(prefs: AgentPreferences): void {
  localStorage.setItem(AGENT_PREFERENCES_KEY, JSON.stringify(normalizePreferences(prefs)))
}

export function isTemplateEnabled(templateId: string, prefs?: AgentPreferences): boolean {
  const p = prefs ?? loadAgentPreferences()
  return !p.disabledTemplateIds.includes(templateId)
}
