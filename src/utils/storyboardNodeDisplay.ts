import type { StoryboardFrame, StoryboardFrameStatus, StoryboardLayout } from '../types/storyboard'

export const STORYBOARD_STRIP_WIDTH = 252
export const STORYBOARD_GRID_COLS = 3
export const STORYBOARD_GRID_ROWS = 3
export const STORYBOARD_GRID_CELLS = STORYBOARD_GRID_COLS * STORYBOARD_GRID_ROWS
export const STORYBOARD_EMPTY_HEIGHT = 72
export const STORYBOARD_MIN_HEIGHT = 140
export const STORYBOARD_MAX_HEIGHT = 180

export interface StoryboardCanvasLayoutSpec {
  layout: StoryboardLayout
  columns: number
  previewCells: number
  stripWidth: number
  minHeight: number
  maxHeight: number
}

export function storyboardCanvasLayoutSpec(layout: StoryboardLayout = 'grid3'): StoryboardCanvasLayoutSpec {
  switch (layout) {
    case 'list':
      return {
        layout: 'list',
        columns: 1,
        previewCells: 5,
        stripWidth: 220,
        minHeight: 128,
        maxHeight: 196,
      }
    case 'grid5':
      return {
        layout: 'grid5',
        columns: 5,
        previewCells: 25,
        stripWidth: 268,
        minHeight: 268,
        maxHeight: 288,
      }
    case 'grid3':
    default:
      return {
        layout: 'grid3',
        columns: 3,
        previewCells: 9,
        stripWidth: STORYBOARD_STRIP_WIDTH,
        minHeight: STORYBOARD_MIN_HEIGHT,
        maxHeight: STORYBOARD_MAX_HEIGHT,
      }
  }
}

export function storyboardCanvasPreviewLimit(layout: StoryboardLayout = 'grid3'): number {
  return storyboardCanvasLayoutSpec(layout).previewCells
}

export function storyboardEmptyHint(): string {
  return '0 帧 · 双击编辑'
}

export function storyboardDisplayTitle(name: string | undefined): string {
  const trimmed = name?.trim()
  return trimmed || '分镜组'
}

export function storyboardFrameStats(frames: StoryboardFrame[]) {
  const withImage = frames.filter((f) => f.imageSrc || f.imagePath).length
  const withVideo = frames.filter(
    (f) => f.videoSrc || f.videoPath || f.status === 'video',
  ).length
  return { total: frames.length, withImage, withVideo }
}

export function storyboardFooterText(frames: StoryboardFrame[]): string {
  const { total, withImage, withVideo } = storyboardFrameStats(frames)
  if (withVideo > 0) return `${total} 帧 · ${withImage} 图 · ${withVideo} 视频`
  if (withImage > 0) return `${total} 帧 · ${withImage} 图`
  return `${total} 帧 · 0 图`
}

export function storyboardPreviewFrames(
  frames: StoryboardFrame[],
  layout: StoryboardLayout = 'grid3',
): StoryboardFrame[] {
  return frames.slice(0, storyboardCanvasPreviewLimit(layout))
}

export function storyboardOverflowCount(
  frames: StoryboardFrame[],
  layout: StoryboardLayout = 'grid3',
): number {
  return Math.max(0, frames.length - storyboardCanvasPreviewLimit(layout))
}

export function storyboardStatusClass(status: StoryboardFrameStatus): string {
  switch (status) {
    case 'image':
      return 'storyboard-node-strip__status--image'
    case 'video':
      return 'storyboard-node-strip__status--video'
    case 'failed':
      return 'storyboard-node-strip__status--failed'
    default:
      return 'storyboard-node-strip__status--empty'
  }
}

export function frameHasVisual(frame: StoryboardFrame): boolean {
  return !!(frame.imageSrc || frame.imagePath)
}

export function frameHasVideoOnly(frame: StoryboardFrame): boolean {
  return (
    !frameHasVisual(frame) &&
    !!(frame.videoSrc || frame.videoPath || frame.status === 'video')
  )
}

export function storyboardSyncedFrameCount(frames: StoryboardFrame[]): number {
  return frames.filter((f) => !!f.imageNodeId).length
}

export function storyboardFailedFrames(frames: StoryboardFrame[]): StoryboardFrame[] {
  return frames.filter((f) => f.status === 'failed')
}

export function storyboardLayoutColumns(layout: 'list' | 'grid3' | 'grid5'): number {
  if (layout === 'grid5') return 5
  if (layout === 'grid3') return 3
  return 1
}

/** grid5 虚拟列表：单格边长 + 间距 */
export const STORYBOARD_GEN_CELL_SIZE_DEFAULT = 72
/** @deprecated 使用 computeStoryboardGenCellSize / STORYBOARD_GEN_CELL_SIZE_DEFAULT */
export const STORYBOARD_GEN_CELL_SIZE = STORYBOARD_GEN_CELL_SIZE_DEFAULT
export const STORYBOARD_GEN_CELL_SIZE_MIN = 48
export const STORYBOARD_GEN_CELL_GAP = 6
export const STORYBOARD_GEN_GRID5_VIRTUAL_THRESHOLD = 15

/** 生成器宫格相对容器自适应时的 layout 缩放（九宫格略小以免占满） */
export function storyboardGenLayoutScale(layout: StoryboardLayout): number {
  if (layout === 'grid3') return 2 / 3
  return 1
}

export function computeStoryboardGenCellSize(
  containerWidth: number,
  containerHeight: number,
  columns: number,
  frameCount: number,
  gap = STORYBOARD_GEN_CELL_GAP,
  fillHeight = false,
  layout: StoryboardLayout = 'grid3',
): number {
  if (containerWidth <= 0 || columns <= 0 || frameCount <= 0) {
    return STORYBOARD_GEN_CELL_SIZE_DEFAULT
  }

  const rows = storyboardGridRowCount(frameCount, columns)
  const widthBased = (containerWidth - gap * (columns - 1)) / columns

  let size = widthBased
  if (fillHeight && containerHeight > 0 && rows > 0) {
    const heightBased = (containerHeight - gap * (rows - 1)) / rows
    const widthTotalHeight = rows * widthBased + (rows - 1) * gap
    if (widthTotalHeight <= containerHeight) {
      size = Math.min(widthBased, heightBased)
    }
  }

  const scaled = size * storyboardGenLayoutScale(layout)
  return Math.max(STORYBOARD_GEN_CELL_SIZE_MIN, Math.floor(scaled))
}

export function storyboardGridRowCount(frameCount: number, columns: number): number {
  if (frameCount <= 0 || columns <= 0) return 0
  return Math.ceil(frameCount / columns)
}

export function storyboardVirtualRowRange(
  scrollTop: number,
  viewportHeight: number,
  rowCount: number,
  rowHeight: number,
  overscan = 1,
): { startRow: number; endRow: number } {
  if (rowCount <= 0) return { startRow: 0, endRow: 0 }
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan,
  )
  return { startRow, endRow }
}
