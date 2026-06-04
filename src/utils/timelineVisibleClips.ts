export interface TimelineClipRange {
  startTime: number
  duration: number
}

/** 仅返回与时间窗口相交的片段，用于时间轴 viewport culling */
export function filterClipsInTimeRange<T extends TimelineClipRange>(
  clips: T[],
  rangeStart: number,
  rangeEnd: number,
): T[] {
  if (clips.length === 0 || rangeEnd <= rangeStart) return clips
  return clips.filter(
    (clip) => clip.startTime + clip.duration >= rangeStart && clip.startTime <= rangeEnd,
  )
}

export function visibleTimeRangeFromScroll(
  scrollLeft: number,
  viewportWidth: number,
  labelWidth: number,
  pixelsPerSecond: number,
  totalDuration: number,
  overscanSeconds = 2,
): { start: number; end: number } {
  const contentLeft = Math.max(0, scrollLeft - labelWidth)
  const contentRight = contentLeft + Math.max(0, viewportWidth - labelWidth)
  const start = Math.max(0, contentLeft / pixelsPerSecond - overscanSeconds)
  const end = Math.min(totalDuration, contentRight / pixelsPerSecond + overscanSeconds)
  return { start, end }
}
