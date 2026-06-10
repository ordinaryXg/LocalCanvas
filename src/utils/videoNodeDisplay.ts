export const VIDEO_CANVAS_EMPTY_WIDTH = 160
export const VIDEO_CANVAS_EMPTY_HEIGHT = 90
export const VIDEO_CANVAS_MIN_WIDTH = 120
export const VIDEO_CANVAS_MIN_HEIGHT = 68
export const VIDEO_CANVAS_MAX_WIDTH = 320
export const VIDEO_CANVAS_MAX_HEIGHT = 280

export interface VideoDisplaySize {
  width: number
  height: number
  clipped: boolean
}

/** 按画布上限计算视频/首帧展示尺寸，超出部分由 object-fit: cover 裁剪 */
export function computeVideoDisplaySize(
  naturalWidth: number,
  naturalHeight: number,
): VideoDisplaySize {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return {
      width: VIDEO_CANVAS_EMPTY_WIDTH,
      height: VIDEO_CANVAS_EMPTY_HEIGHT,
      clipped: false,
    }
  }

  const ratio = naturalWidth / naturalHeight
  let width = naturalWidth
  let height = naturalHeight
  let clipped = false

  if (width > VIDEO_CANVAS_MAX_WIDTH) {
    width = VIDEO_CANVAS_MAX_WIDTH
    height = width / ratio
    clipped = true
  }
  if (height > VIDEO_CANVAS_MAX_HEIGHT) {
    height = VIDEO_CANVAS_MAX_HEIGHT
    width = height * ratio
    clipped = true
  }
  if (width > VIDEO_CANVAS_MAX_WIDTH) {
    width = VIDEO_CANVAS_MAX_WIDTH
    clipped = true
  }

  if (width < VIDEO_CANVAS_MIN_WIDTH && height < VIDEO_CANVAS_MIN_HEIGHT) {
    if (ratio >= 1) {
      width = VIDEO_CANVAS_MIN_WIDTH
      height = width / ratio
    } else {
      height = VIDEO_CANVAS_MIN_HEIGHT
      width = height * ratio
    }
    const clampScale = Math.min(
      VIDEO_CANVAS_MAX_WIDTH / width,
      VIDEO_CANVAS_MAX_HEIGHT / height,
      1,
    )
    width *= clampScale
    height *= clampScale
  }

  width = Math.round(
    Math.max(VIDEO_CANVAS_MIN_WIDTH, Math.min(VIDEO_CANVAS_MAX_WIDTH, width)),
  )
  height = Math.round(
    Math.max(VIDEO_CANVAS_MIN_HEIGHT, Math.min(VIDEO_CANVAS_MAX_HEIGHT, height)),
  )

  clipped =
    clipped ||
    naturalWidth > width + 1 ||
    naturalHeight > height + 1

  return { width, height, clipped }
}

export function emptyVideoDisplaySize(): VideoDisplaySize {
  return {
    width: VIDEO_CANVAS_EMPTY_WIDTH,
    height: VIDEO_CANVAS_EMPTY_HEIGHT,
    clipped: false,
  }
}
