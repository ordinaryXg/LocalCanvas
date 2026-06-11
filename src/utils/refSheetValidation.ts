import type { ShotSpec } from '../types/agent'

export function shotsNeedRefSheet(shots: ShotSpec[]): boolean {
  return shots.some((s) => s.productionMode === 'ref-sheet')
}

export function validateRefSheetShots(
  shots: ShotSpec[],
  hasReferenceImage: boolean,
): string[] {
  if (!shotsNeedRefSheet(shots)) return []
  if (hasReferenceImage) return []
  return [
    '存在 ref-sheet 镜头但未连接产品参考图节点，请在 Build 模式选中参考图后再展开，或为 HERO 镜改用 i2v。',
  ]
}
