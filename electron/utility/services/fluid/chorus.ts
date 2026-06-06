import type { ChorusResolution, ResonanceField } from '../../../../src/types/fluid'
import { renormalizeGravity } from './compile-prompt'

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value
  if (value != null && typeof value === 'object') return [value as T]
  return []
}

/** LLM / IPC payloads may omit or malform resolution fields — normalize before apply. */
export function normalizeChorusResolution(res: unknown): ChorusResolution {
  const r = (res && typeof res === 'object' ? res : {}) as Partial<ChorusResolution>
  return {
    tuningAdjustments: asArray<{ sourceId?: string; tag?: string; gravityDelta?: number }>(
      r.tuningAdjustments,
    )
      .filter((adj) => adj && (adj.sourceId || adj.tag))
      .map((adj) => ({
        sourceId: adj.sourceId,
        tag: adj.tag,
        gravityDelta: typeof adj.gravityDelta === 'number' ? adj.gravityDelta : 0,
      })),
    affectAdjustments: asArray(r.affectAdjustments),
    promptModifiers: asArray<string>(r.promptModifiers).filter((s) => typeof s === 'string'),
    blockers: asArray<string>(r.blockers).filter((s) => typeof s === 'string'),
  }
}

export function applyResolution(
  field: ResonanceField,
  res: ChorusResolution | unknown,
): ResonanceField {
  const normalized = normalizeChorusResolution(res)
  let sources = [...field.sources]
  for (const adj of normalized.tuningAdjustments) {
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
