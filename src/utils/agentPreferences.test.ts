import { describe, it, expect, beforeEach } from 'vitest'
import {
  AGENT_PREFERENCES_KEY,
  loadAgentPreferences,
  saveAgentPreferences,
  DEFAULT_AGENT_PREFERENCES,
  resolveAgentMode,
} from './agentPreferences'

describe('agentPreferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('migrates legacy disabled-skills key', () => {
    localStorage.setItem('lc-agent-disabled-skills', JSON.stringify(['text-to-video']))
    const prefs = loadAgentPreferences()
    expect(prefs.disabledTemplateIds).toEqual(['text-to-video'])
    expect(localStorage.getItem('lc-agent-disabled-skills')).toBeNull()
    expect(localStorage.getItem(AGENT_PREFERENCES_KEY)).toBeTruthy()
  })

  it('prefers legacy disabled-templates over disabled-skills', () => {
    localStorage.setItem('lc-agent-disabled-skills', JSON.stringify(['a']))
    localStorage.setItem('lc-agent-disabled-templates', JSON.stringify(['b']))
    const prefs = loadAgentPreferences()
    expect(prefs.disabledTemplateIds).toEqual(['b'])
  })

  it('round-trips save and load', () => {
    saveAgentPreferences({
      ...DEFAULT_AGENT_PREFERENCES,
      autoRunAfterConfirm: false,
      disabledTemplateIds: ['script-to-film'],
    })
    const prefs = loadAgentPreferences()
    expect(prefs.autoRunAfterConfirm).toBe(false)
    expect(prefs.disabledTemplateIds).toEqual(['script-to-film'])
  })

  it('resolveAgentMode auto picks build when nodes selected', () => {
    expect(resolveAgentMode(DEFAULT_AGENT_PREFERENCES, 2, null)).toBe('build')
    expect(resolveAgentMode(DEFAULT_AGENT_PREFERENCES, 0, null)).toBe('plan')
    expect(resolveAgentMode({ ...DEFAULT_AGENT_PREFERENCES, defaultMode: 'plan' }, 2, null)).toBe('plan')
  })
})
