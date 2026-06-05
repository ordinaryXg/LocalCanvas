import type { ModelCapabilityProfile } from '../types/capability'

const cache = new Map<string, ModelCapabilityProfile>()

export function setProbedProfile(configId: string, profile: ModelCapabilityProfile): void {
  cache.set(configId, profile)
}

export function getProbedProfile(configId: string): ModelCapabilityProfile | undefined {
  return cache.get(configId)
}

export function loadProbedProfiles(
  entries: Array<{ configId: string; profile: ModelCapabilityProfile }>,
): void {
  cache.clear()
  for (const entry of entries) {
    cache.set(entry.configId, entry.profile)
  }
}

export function listProbedConfigIds(): string[] {
  return [...cache.keys()]
}
