import type { AffectEnvelope } from '../../../../src/types/fluid'

export function detectCliffs(
  arousal: number[],
  sampleRate: number,
  threshold = 0.35,
): Array<{ timeSec: number; delta: number; slope: number }> {
  const out: Array<{ timeSec: number; delta: number; slope: number }> = []
  for (let i = 1; i < arousal.length; i++) {
    const dt = 1 / sampleRate
    const slope = (arousal[i] - arousal[i - 1]) / dt
    if (Math.abs(slope) > threshold) {
      out.push({ timeSec: i / sampleRate, delta: arousal[i] - arousal[i - 1], slope })
    }
  }
  return out
}

export function formatAffectHint(t: number, env: AffectEnvelope): string {
  const idx = Math.min(env.arousalSeries.length - 1, Math.floor(t * env.sampleRate))
  const a = env.arousalSeries[idx] ?? 0.5
  const v = env.valenceSeries[idx] ?? 0
  return `emotional tone: arousal ${a.toFixed(2)}, valence ${v.toFixed(2)}`
}

export function computeTemperature(input: {
  openSuperposedCount: number
  recentEditCount24h: number
  crystallizedRatio: number
  hoursSinceLastSession: number
}): number {
  const heat =
    input.openSuperposedCount * 0.12 +
    input.recentEditCount24h * 0.04 +
    Math.max(0, 1 - input.hoursSinceLastSession / 24) * 0.1
  const cool = input.crystallizedRatio * 0.55
  return Math.max(0.15, Math.min(0.95, 0.35 + heat - cool))
}

export function createDefaultEnvelope(projectId: string, durationSec = 30): AffectEnvelope {
  const sampleRate = 2
  const len = Math.max(2, Math.ceil(durationSec * sampleRate))
  return {
    projectId,
    durationSec,
    sampleRate,
    arousalSeries: Array.from({ length: len }, () => 0.4),
    valenceSeries: Array.from({ length: len }, () => 0),
    anchors: [],
    updatedAt: new Date().toISOString(),
  }
}
