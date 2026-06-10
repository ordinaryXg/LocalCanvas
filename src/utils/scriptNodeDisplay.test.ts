import { describe, expect, it } from 'vitest'
import type { ScriptRow } from '../types/node'
import {
  formatScriptShotLine,
  scriptEmptyHint,
  scriptFooterText,
  scriptTotalDuration,
  truncateSynopsis,
} from './scriptNodeDisplay'

const row = (sequence: number, description: string): ScriptRow => ({
  id: `r${sequence}`,
  sequence,
  description,
  prompt: '',
  duration: 5,
  camera: '静止',
})

describe('scriptNodeDisplay', () => {
  it('formats footer stats', () => {
    expect(scriptFooterText(3, 15)).toBe('共 3 镜 · 15s')
  })

  it('sums duration', () => {
    expect(scriptTotalDuration([row(1, 'a'), row(2, 'b')])).toBe(10)
  })

  it('formats shot line with circled number', () => {
    expect(formatScriptShotLine(row(1, '开场')).startsWith('①')).toBe(true)
  })

  it('truncates synopsis', () => {
    expect(truncateSynopsis('abcdef', 3)).toBe('abc…')
  })

  it('provides empty hint', () => {
    expect(scriptEmptyHint()).toContain('0 镜')
  })
})
