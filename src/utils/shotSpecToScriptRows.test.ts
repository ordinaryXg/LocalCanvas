import { describe, it, expect } from 'vitest'
import {
  shotSpecToScriptRow,
  shotSpecsToScriptRows,
  validateDurationBudget,
  clampShotDuration,
} from './shotSpecToScriptRows'
import type { ShotSpec } from '../types/agent'

const baseShot: ShotSpec = {
  sequence: 1,
  beat: 'HOOK',
  description: '开场',
  prompt: '咖啡特写',
  durationSec: 5,
  camera: 'wide',
  productionMode: 'i2v',
}

describe('shotSpecToScriptRows', () => {
  it('maps ShotSpec to ScriptRow', () => {
    const row = shotSpecToScriptRow({
      ...baseShot,
      dialogue: '你好',
      vo: '旁白稿',
    })
    expect(row.sequence).toBe(1)
    expect(row.prompt).toBe('咖啡特写')
    expect(row.duration).toBe(5)
    expect(row.description).toContain('[对白] 你好')
    expect(row.description).toContain('[旁白] 旁白稿')
    expect(row.id).toMatch(/^shot-/)
  })

  it('clamps duration and enforces flf minimum', () => {
    expect(clampShotDuration(0, 'i2v')).toBe(1)
    expect(clampShotDuration(40, 'i2v')).toBe(30)
    expect(clampShotDuration(2, 'flf')).toBe(3)
  })

  it('sorts shots by sequence', () => {
    const rows = shotSpecsToScriptRows([
      { ...baseShot, sequence: 2, description: 'B' },
      { ...baseShot, sequence: 1, description: 'A' },
    ])
    expect(rows[0].description).toContain('A')
    expect(rows[1].description).toContain('B')
  })

  it('validates duration budget levels', () => {
    const ok = validateDurationBudget([baseShot], 5)
    expect(ok.level).toBe('ok')

    const warn = validateDurationBudget(
      [
        { ...baseShot, sequence: 1, durationSec: 16 },
        { ...baseShot, sequence: 2, durationSec: 17 },
      ],
      30,
    )
    expect(warn.level).toBe('warn')

    const block = validateDurationBudget(
      [
        { ...baseShot, sequence: 1, durationSec: 20 },
        { ...baseShot, sequence: 2, durationSec: 20 },
      ],
      30,
    )
    expect(block.level).toBe('block')
    expect(block.ok).toBe(false)
  })
})
