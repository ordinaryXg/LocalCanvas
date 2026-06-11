import type { ShotSpec } from '../types/agent'

/** 每个 sceneId 的最后一镜 sequence */
export function getSceneBoundarySequences(shots: ShotSpec[]): number[] {
  const lastByScene = new Map<string, number>()
  for (const shot of shots) {
    const key = shot.sceneId ?? `seq-${shot.sequence}`
    const prev = lastByScene.get(key)
    if (prev === undefined || shot.sequence > prev) {
      lastByScene.set(key, shot.sequence)
    }
  }
  return [...lastByScene.values()].sort((a, b) => a - b)
}

export function isSceneBoundaryShot(shot: ShotSpec, shots: ShotSpec[]): boolean {
  if (!shot.sceneId) return false
  const boundaries = getSceneBoundarySequences(shots)
  return boundaries.includes(shot.sequence)
}

export function shotHasSceneCheckpoints(shots: ShotSpec[]): boolean {
  const sceneIds = new Set(shots.map((s) => s.sceneId).filter(Boolean))
  return sceneIds.size >= 2
}
