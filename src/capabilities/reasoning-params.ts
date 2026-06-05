import type { ModelCapabilityProfile, ThinkingPreset } from '../types/capability'

export function supportsThinkingUi(profile: ModelCapabilityProfile): boolean {
  const ui = profile.reasoning?.ui_preset
  return ui === 'off_balanced_deep'
}

export function defaultThinkingPreset(profile: ModelCapabilityProfile): ThinkingPreset {
  if (!supportsThinkingUi(profile)) return 'balanced'
  if (profile.reasoning?.control_kind === 'always_reasoning') return 'balanced'
  return 'balanced'
}

/** 将统一三档映射为 API 请求体片段（浅合并进 chat completion body） */
export function buildReasoningParams(
  profile: ModelCapabilityProfile,
  preset: ThinkingPreset = 'balanced',
): Record<string, unknown> {
  const reasoning = profile.reasoning
  if (!reasoning?.preset_levels) return {}

  const mapping = reasoning.preset_levels[preset] ?? reasoning.preset_levels.balanced
  if (!mapping) return {}

  return { ...mapping }
}

export function shouldForceStream(
  profile: ModelCapabilityProfile,
  preset: ThinkingPreset,
): boolean {
  if (preset === 'off') return false
  return profile.reasoning?.stream_required_when_enabled === true
}
