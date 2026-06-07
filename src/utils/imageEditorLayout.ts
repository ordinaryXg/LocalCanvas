export const IMAGE_NODE_DEFAULT_WIDTH = 240
export const IMAGE_NODE_DEFAULT_HEIGHT = 280
export const IMAGE_NODE_MIN_WIDTH = 200
export const IMAGE_NODE_MIN_HEIGHT = 280
export const IMAGE_NODE_MAX_WIDTH = 560
export const IMAGE_NODE_MAX_HEIGHT = 720

/** 底部编辑器预览区默认/边界（与画布节点尺寸无关） */
export const DEFAULT_EDITOR_PREVIEW_HEIGHT = 260
export const DEFAULT_EDITOR_PREVIEW_WIDTH = 480
export const PREVIEW_HEIGHT_MIN = 120
export const PREVIEW_HEIGHT_MAX = 720
export const PREVIEW_WIDTH_MIN = 200
/** 上限由容器宽度动态裁剪，此为绝对上限 */
export const PREVIEW_WIDTH_MAX = 1400

export interface ImageEditorLayout {
  previewMinHeight: number
  paramsWidth: number
  stackVertical: boolean
  drawerHeightRatio: number
  promptMinHeight: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** 根据画布图片节点尺寸推导布局（仅画布节点用，不与编辑器预览联动） */
export function layoutFromImageNodeSize(
  width = IMAGE_NODE_DEFAULT_WIDTH,
  height = IMAGE_NODE_DEFAULT_HEIGHT,
): ImageEditorLayout {
  const w = clamp(width, IMAGE_NODE_MIN_WIDTH, IMAGE_NODE_MAX_WIDTH)
  const h = clamp(height, IMAGE_NODE_MIN_HEIGHT, IMAGE_NODE_MAX_HEIGHT)

  const aspect = w / h
  const stackVertical = aspect < 0.92

  const previewMinHeight = clamp(Math.round(h * 0.72), 160, 520)
  const paramsWidth = clamp(Math.round(w * 0.42), 220, 360)
  const promptMinHeight = clamp(Math.round(56 + (h - IMAGE_NODE_MIN_HEIGHT) * 0.08), 56, 120)

  const heightT =
    (h - IMAGE_NODE_MIN_HEIGHT) / (IMAGE_NODE_MAX_HEIGHT - IMAGE_NODE_MIN_HEIGHT)
  const drawerHeightRatio = clamp(0.3 + heightT * 0.38, 0.3, 0.68)

  return { previewMinHeight, paramsWidth, stackVertical, drawerHeightRatio, promptMinHeight }
}
