import { describe, expect, it } from 'vitest'
import { computeTemperature, detectCliffs, createDefaultEnvelope } from './affect-math'

describe('detectCliffs', () => {
  it('detects steep slope', () => {
    const series = [0.2, 0.2, 0.9, 0.9]
    const cliffs = detectCliffs(series, 2, 0.35)
    expect(cliffs.length).toBeGreaterThan(0)
  })
})

describe('computeTemperature', () => {
  it('stays in range', () => {
    const t = computeTemperature({
      openSuperposedCount: 2,
      recentEditCount24h: 5,
      crystallizedRatio: 0.2,
      hoursSinceLastSession: 1,
    })
    expect(t).toBeGreaterThanOrEqual(0.15)
    expect(t).toBeLessThanOrEqual(0.95)
  })
})

describe('createDefaultEnvelope', () => {
  it('has correct series length', () => {
    const env = createDefaultEnvelope('p', 30)
    expect(env.arousalSeries.length).toBe(60)
  })
})
