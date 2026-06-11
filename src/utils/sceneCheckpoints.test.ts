import { describe, it, expect } from 'vitest'
import {
  getSceneBoundarySequences,
  isSceneBoundaryShot,
  shotHasSceneCheckpoints,
} from './sceneCheckpoints'
import type { ShotSpec } from '../types/agent'

const narrativeShots: ShotSpec[] = [
  { sequence: 1, sceneId: 'scene-1', description: 'a', prompt: 'a', durationSec: 5, camera: 'wide' },
  { sequence: 2, sceneId: 'scene-1', description: 'b', prompt: 'b', durationSec: 5, camera: 'wide' },
  { sequence: 3, sceneId: 'scene-2', description: 'c', prompt: 'c', durationSec: 5, camera: 'wide' },
  { sequence: 4, sceneId: 'scene-2', description: 'd', prompt: 'd', durationSec: 5, camera: 'wide' },
]

describe('sceneCheckpoints', () => {
  it('finds last shot per scene', () => {
    expect(getSceneBoundarySequences(narrativeShots)).toEqual([2, 4])
  })

  it('marks scene boundary shots', () => {
    expect(isSceneBoundaryShot(narrativeShots[1], narrativeShots)).toBe(true)
    expect(isSceneBoundaryShot(narrativeShots[0], narrativeShots)).toBe(false)
  })

  it('detects multi-scene plans', () => {
    expect(shotHasSceneCheckpoints(narrativeShots)).toBe(true)
    expect(
      shotHasSceneCheckpoints([
        { sequence: 1, description: 'a', prompt: 'a', durationSec: 5, camera: 'wide' },
      ]),
    ).toBe(false)
  })
})
