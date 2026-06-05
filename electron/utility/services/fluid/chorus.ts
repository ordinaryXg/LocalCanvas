import type { ChorusResolution, ResonanceField, ResonanceSource } from '../../../../src/types/fluid'
import { renormalizeGravity } from './compile-prompt'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function applyResolution(
  field: ResonanceField,
  res: ChorusResolution,
): ResonanceField {
  let sources = [...field.sources]
  for (const adj of res.tuningAdjustments) {
    if (adj.sourceId) {
      sources = sources.map((s) =>
        s.id === adj.sourceId
          ? { ...s, gravity: clamp(s.gravity + adj.gravityDelta, 0, 1) }
          : s,
      )
    } else if (adj.tag) {
      const tag = adj.tag.toLowerCase()
      sources = sources.map((s) => {
        const hit =
          s.summary.metaphor?.toLowerCase().includes(tag) ||
          s.summary.tags?.some((t) => t.toLowerCase().includes(tag))
        return hit ? { ...s, gravity: clamp(s.gravity + adj.gravityDelta, 0, 1) } : s
      })
    }
  }
  return { ...field, sources: renormalizeGravity(sources) }
}
