export const IMAGE_CANVAS_MIN_WIDTH = 120
export const IMAGE_CANVAS_MIN_HEIGHT = 120
export const IMAGE_CANVAS_MAX_WIDTH = 320
export const IMAGE_CANVAS_MAX_HEIGHT = 280
export const IMAGE_CANVAS_EMPTY_WIDTH = 160
export const IMAGE_CANVAS_EMPTY_HEIGHT = 120
export const CANVAS_NODE_SHELL_PAD = 8

export interface ImageDisplaySize {
  width: number
  height: number
  clipped: boolean
}

/** 按画布上限计算图片展示尺寸，超出部分由 object-fit: cover 裁剪 */
export function computeImageDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
): ImageDisplaySize {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return {
      width: IMAGE_CANVAS_EMPTY_WIDTH,
      height: IMAGE_CANVAS_EMPTY_HEIGHT,
      clipped: false,
    }
  }

  const ratio = naturalWidth / naturalHeight
  let width = naturalWidth
  let height = naturalHeight
  let clipped = false

  if (width > IMAGE_CANVAS_MAX_WIDTH) {
    width = IMAGE_CANVAS_MAX_WIDTH
    height = width / ratio
    clipped = true
  }
  if (height > IMAGE_CANVAS_MAX_HEIGHT) {
    height = IMAGE_CANVAS_MAX_HEIGHT
    width = height * ratio
    clipped = true
  }
  if (width > IMAGE_CANVAS_MAX_WIDTH) {
    width = IMAGE_CANVAS_MAX_WIDTH
    clipped = true
  }

  if (width < IMAGE_CANVAS_MIN_WIDTH && height < IMAGE_CANVAS_MIN_HEIGHT) {
    if (ratio >= 1) {
      width = IMAGE_CANVAS_MIN_WIDTH
      height = width / ratio
    } else {
      height = IMAGE_CANVAS_MIN_HEIGHT
      width = height * ratio
    }
    const clampScale = Math.min(
      IMAGE_CANVAS_MAX_WIDTH / width,
      IMAGE_CANVAS_MAX_HEIGHT / height,
      1,
    )
    width *= clampScale
    height *= clampScale
  }

  width = Math.round(
    Math.max(IMAGE_CANVAS_MIN_WIDTH, Math.min(IMAGE_CANVAS_MAX_WIDTH, width)),
  )
  height = Math.round(
    Math.max(IMAGE_CANVAS_MIN_HEIGHT, Math.min(IMAGE_CANVAS_MAX_HEIGHT, height)),
  )

  clipped =
    clipped ||
    naturalWidth > width + 1 ||
    naturalHeight > height + 1

  return { width, height, clipped }
}
