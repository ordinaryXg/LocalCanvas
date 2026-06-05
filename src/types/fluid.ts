export type BreathPhase = 'idle' | 'inhale' | 'hold' | 'exhale'
export type FluidPhase = 'explore' | 'converge' | 'freeze'
export type VoiceId =
  | 'impulse'
  | 'skeptic'
  | 'nostalgic'
  | 'perfectionist'
  | 'bystander'
  | 'dormant'

export type ResonanceSourceType = 'hum' | 'blur_image' | 'phrase' | 'clip_3s'

/** 8-dim pseudo vector for MVP */
export type ResonanceVector = number[]

export interface ResonanceSummary {
  colorTemp: number
  colorHex: string
  arousal: number
  valence: number
  metaphor: string
  rhythmBpm?: number
  motionLevel?: number
  tags?: string[]
}

export interface ResonanceSource {
  id: string
  projectId: string
  type: ResonanceSourceType
  payload: { text?: string; assetPath?: string; clipIn?: number }
  vector: ResonanceVector
  summary: ResonanceSummary
  gravity: number
  orbitIndex: number
  createdAt: string
}

export interface ResonanceField {
  projectId: string
  sources: ResonanceSource[]
}

export interface FluidState {
  projectId: string
  temperature: number
  viscosity: number
  surfaceTension: number
  phase: FluidPhase
  userTemperatureOverride: number | null
  lastSessionEndedAt: string | null
  crystallizedShotIds: string[]
  updatedAt: string
}

export interface FluidEvent {
  id: string
  projectId: string
  eventName: string
  payload?: Record<string, unknown>
  createdAt: string
}

export interface ShotCandidate {
  id: string
  shotSlotId: string
  projectId: string
  assetPath: string
  thumbPath: string
  probability: number
  isPrimary: boolean
  promptSnapshot: string
  resonanceHash?: string
  status: 'active' | 'archived'
  createdAt: string
}

export interface ShotSlotBinding {
  shotSlotId: string
  projectId: string
  nodeId: string
  nodeType: 'video' | 'storyboardCell'
  cellIndex?: number
  createdAt: string
}

export interface AffectAnchor {
  id: string
  timeSec: number
  arousal: number
  valence: number
  label?: string
}

export interface AffectEnvelope {
  projectId: string
  durationSec: number
  sampleRate: number
  arousalSeries: number[]
  valenceSeries: number[]
  anchors: AffectAnchor[]
  updatedAt: string
}

export interface PalimpsestLayer {
  id: string
  projectId: string
  depth: number
  eventType: 'reject' | 'abandon' | 'brief' | 'manual_note'
  assetPath?: string
  textSnapshot?: string
  userReason?: string
  metaphorTags: string[]
  emotionalSignature: { arousal: number; valence: number }
  vitality: number
  createdAt: string
}

export interface ChorusResolution {
  tuningAdjustments: Array<{ sourceId?: string; tag?: string; gravityDelta: number }>
  affectAdjustments?: Array<{ timeSec: number; arousalDelta: number }>
  promptModifiers: string[]
  blockers: string[]
}

export interface ChorusUtterance {
  id: string
  sessionId: string
  voiceId: VoiceId
  text: string
  stance: 'propose' | 'oppose' | 'amend'
  createdAt: string
}

export interface GhostPreview {
  id: string
  projectId: string
  thumbPath: string
  assetPath: string
  compiledPrompt: string
  resonanceHash: string
  status: 'pending' | 'shown' | 'promoted' | 'dismissed'
  createdAt: string
}

export interface CrystallizePrecheck {
  ok: boolean
  collapsedRatio: number
  unresolvedGhosts: number
  pendingCliffs: number
  durationSec: number
  blockers: string[]
}

export interface CompiledPrompt {
  prompt: string
  negativePrompt: string
}

export interface FakeElement {
  id: string
  label: string
  reason: string
  promptTokensToRemove: string[]
  negativeTerms: string[]
  confidence: number
}

export function shotSlotIdForNode(nodeId: string, cellIndex?: number): string {
  if (cellIndex != null) return `storyboard:${nodeId}:${cellIndex}`
  return `videoNode:${nodeId}`
}

export const FLUID_INTENT_NODE_PREFIX = 'fluid-intent-'
export const METAPHOR_INJECT_PREFIX =
  'Apply mood and metaphor only, do NOT copy exact faces, costumes, or layouts: '
