import type { CompiledPrompt, ResonanceField, ResonanceSource } from '../../../../src/types/fluid'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function renormalizeGravity(sources: ResonanceSource[]): ResonanceSource[] {
  const sum = sources.reduce((a, s) => a + s.gravity, 0)
  if (sum <= 0) return sources.map((s) => ({ ...s, gravity: 1 / sources.length }))
  return sources.map((s) => ({ ...s, gravity: s.gravity / sum }))
}

function blendSummaries(sources: ResonanceSource[]) {
  if (sources.length === 0) {
    return {
      colorTemp: 5000,
      metaphor: '',
      arousal: 0.5,
      valence: 0,
      colorHex: '#888888',
    }
  }
  const total = sources.reduce((a, s) => a + s.gravity, 0) || 1
  let colorTemp = 0
  let arousal = 0
  let valence = 0
  const metaphors: string[] = []
  for (const s of sources) {
    const w = s.gravity / total
    colorTemp += s.summary.colorTemp * w
    arousal += s.summary.arousal * w
    valence += s.summary.valence * w
    if (s.summary.metaphor) metaphors.push(s.summary.metaphor)
  }
  return {
    colorTemp,
    arousal,
    valence,
    metaphor: metaphors.join('; '),
    colorHex: sources[0]?.summary.colorHex ?? '#888888',
  }
}

export function compilePrompt(base: string, field: ResonanceField): CompiledPrompt {
  const active = field.sources.filter((s) => s.gravity > 0.05)
  const blended = blendSummaries(active)
  const parts = [
    base.trim(),
    blended.metaphor && `mood: ${blended.metaphor}`,
    blended.colorTemp < 4500 && 'cool color grading, low key lighting',
    blended.colorTemp > 6500 && 'warm golden light',
    blended.arousal > 0.7 && 'high energy, dynamic composition',
    blended.valence < -0.2 && 'melancholic atmosphere',
  ].filter(Boolean)
  const negative = field.sources
    .filter((s) => s.gravity < 0.15 && s.summary.metaphor)
    .map((s) => `avoid ${s.summary.metaphor}`)
    .join(', ')
  return {
    prompt: parts.join(', '),
    negativePrompt: negative,
  }
}

export function attenuateFrequency(
  sources: ResonanceSource[],
  tag: string,
  amount: number,
): ResonanceSource[] {
  const next = sources.map((s) => {
    const hit =
      s.summary.metaphor?.toLowerCase().includes(tag.toLowerCase()) ||
      s.summary.tags?.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    if (!hit) return s
    return { ...s, gravity: clamp(s.gravity + amount, 0, 1) }
  })
  return renormalizeGravity(next)
}
