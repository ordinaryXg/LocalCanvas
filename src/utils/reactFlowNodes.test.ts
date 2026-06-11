import { describe, expect, it } from 'vitest'
import { sortNodesForReactFlow } from './reactFlowNodes'
import { canonicalSeedanceApiModel, SEEDANCE_MODEL_1_5_PRO } from '../constants/seedance'

describe('sortNodesForReactFlow', () => {
  it('places parent group before children', () => {
    const nodes = [
      { id: 'child', parentId: 'group-1' },
      { id: 'group-1' },
    ]
    const sorted = sortNodesForReactFlow(nodes)
    expect(sorted.map((n) => n.id)).toEqual(['group-1', 'child'])
  })
})

describe('canonicalSeedanceApiModel', () => {
  it('prefers config id over mismatched stored model field', () => {
    expect(
      canonicalSeedanceApiModel('seedance-1-5-pro', 'doubao-seedance-2-0-260128'),
    ).toBe(SEEDANCE_MODEL_1_5_PRO)
  })
})
