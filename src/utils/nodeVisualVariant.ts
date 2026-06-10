/** 由节点 id 派生稳定的画布节点外观（旋转、不规则圆角），避免重渲染抖动 */
export interface NodeVisualVariant {
  rotateDeg: number
  borderRadius: string
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function getNodeVisualVariant(nodeId: string): NodeVisualVariant {
  const h = hashString(nodeId)
  const rotateDeg = ((h % 37) - 18) / 10
  const r = [
    2 + (h % 4),
    5 + ((h >> 4) % 5),
    3 + ((h >> 8) % 4),
    6 + ((h >> 12) % 3),
  ]
  return {
    rotateDeg,
    borderRadius: `${r[0]}px ${r[1]}px ${r[2]}px ${r[3]}px / ${r[3]}px ${r[0]}px ${r[1]}px ${r[2]}px`,
  }
}
