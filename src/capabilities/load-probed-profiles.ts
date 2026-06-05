import { loadProbedProfiles } from './probed-profile-cache'

export async function hydrateProbedProfileCache(): Promise<void> {
  const entries = await window.api.capability.listProbedProfiles()
  loadProbedProfiles(
    entries.map((entry) => ({
      configId: entry.configId,
      profile: entry.profile,
    })),
  )
}
