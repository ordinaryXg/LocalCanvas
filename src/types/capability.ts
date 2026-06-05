export type Modality = 'text' | 'image' | 'video' | 'audio'

export type ModelKind = 'llm' | 'image' | 'video' | 'tts'

export type CapabilitySource = 'builtin' | 'provider_api' | 'probe' | 'inferred'

export type Confidence = 'verified' | 'documented' | 'inferred' | 'unknown'

export type ReasoningControlKind =
  | 'none'
  | 'hybrid_toggle'
  | 'effort_levels'
  | 'budget_tokens'
  | 'adaptive_effort'
  | 'always_reasoning'
  | 'separate_model'

export type ThinkingPreset = 'off' | 'balanced' | 'deep'

export type ReasoningUiPreset = 'off_balanced_deep' | 'hidden' | 'model_implied'

export type EdgeCompatStatus = 'solid' | 'dashed_warn'

export interface InputSlotSpec {
  id: string
  modality: Modality
  required?: boolean
  min_count?: number
  max_count: number
  accepts_handles?: string[]
}

export interface OutputSpec {
  modality: Modality
  async?: boolean
  poll_required?: boolean
}

export interface ReasoningProfile {
  control_kind: ReasoningControlKind
  ui_preset: ReasoningUiPreset
  preset_levels?: Partial<Record<ThinkingPreset, Record<string, unknown>>>
  output_field?: 'reasoning_content' | 'thinking' | 'thought_summary'
  stream_required_when_enabled?: boolean
  warnings?: string[]
}

export interface ModelAlias {
  deprecated_id: string
  maps_to: string
  runtime_default?: ThinkingPreset
  sunset?: string
  note?: string
}

export interface ModelCapabilityProfile {
  profile_key: string
  provider: string
  model_pattern: string
  kind: ModelKind
  display_name: string
  /** 关联 modelPresets / config.yaml 中的 id */
  config_ids?: string[]
  inputs: InputSlotSpec[]
  outputs: OutputSpec[]
  reasoning?: ReasoningProfile
  aliases?: ModelAlias[]
  confidence: Confidence
  source: CapabilitySource
  doc_url?: string
  version: number
}

export interface EdgeCompatResult {
  status: EdgeCompatStatus | 'reject'
  reason?: string
}

export interface NodeRuntimePrefs {
  thinkingPreset?: ThinkingPreset
}
