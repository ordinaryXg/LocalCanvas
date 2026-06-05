import type { Confidence, ModelCapabilityProfile, ModelKind } from './capability'

export interface CapabilitySyncSourceResult {
  provider_key: string
  provider: string
  ok: boolean
  modelCount: number
  error?: string
}

export interface DiscoveredModelEntry {
  model_id: string
  kind: ModelKind
  profile_key: string
  display_name: string
  in_catalog: boolean
  already_added: boolean
  has_preset: boolean
  preset_id?: string
  confidence: Confidence
}

export interface CapabilitySyncResult {
  ok: boolean
  syncedAt: string
  catalogVersion: number
  sources: CapabilitySyncSourceResult[]
  discovered: DiscoveredModelEntry[]
}

export interface CapabilityCacheStatus {
  catalogVersion: number
  lastSyncedAt: string | null
  totalCached: number
  discoveredCount: number
  unmappedCount: number
  discovered: DiscoveredModelEntry[]
  sources: Array<{
    provider_key: string
    provider: string
    endpoint: string
    last_sync_at: string | null
    last_error: string | null
    model_count: number
  }>
}

export interface CapabilityProbeRequest {
  kind: ModelKind
  configId: string
}

export interface CapabilityProbeResult {
  ok: boolean
  probedAt: string
  profile: ModelCapabilityProfile
  message: string
}

export interface ProbedProfileEntry {
  configId: string
  profile: ModelCapabilityProfile
  probedAt: string
}
