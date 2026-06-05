import type { ComposeClipItem } from '../types/node'

const VIDEO_HANDLE_RE = /^video(\d+)$/

export function isComposeVideoHandle(handle: string | null | undefined): boolean {
  return !!handle && VIDEO_HANDLE_RE.test(handle)
}

export function videoHandleFromIndex(index: number): string {
  return `video${index + 1}`
}

export function slotIndexFromHandle(handle: string): number {
  const m = handle.match(VIDEO_HANDLE_RE)
  return m ? parseInt(m[1], 10) - 1 : -1
}

export function clipIdFromEdge(sourceId: string, handle: string): string {
  return `${sourceId}-${handle}`
}

export function normalizeClip(
  item: Partial<ComposeClipItem> & { id: string },
): ComposeClipItem {
  return {
    trimIn: 0,
    duration: 5,
    excluded: false,
    ...item,
    id: item.id,
    trimIn: item.trimIn ?? 0,
    duration: item.duration ?? 5,
    excluded: item.excluded ?? false,
  }
}

export function getActiveClips(clips: ComposeClipItem[]): ComposeClipItem[] {
  return clips.filter((c) => !c.excluded && (c.duration ?? 0) > 0)
}

/** 顺序模式：按数组顺序首尾相接计算 startTime */
export function applySequentialStartTimes(clips: ComposeClipItem[]): ComposeClipItem[] {
  let t = 0
  return clips.map((c) => {
    if (c.excluded) return { ...c, startTime: t }
    const startTime = t
    t += c.duration || 0
    return { ...c, startTime }
  })
}

export function totalActiveDuration(clips: ComposeClipItem[]): number {
  return getActiveClips(clips).reduce((s, c) => s + (c.duration || 0), 0)
}

export function requiredVideoInputCount(
  clips: ComposeClipItem[],
  connectedCount: number,
): number {
  let maxSlot = 0
  for (const c of clips) {
    const m = c.id.match(/-video(\d+)$/)
    if (m) maxSlot = Math.max(maxSlot, parseInt(m[1], 10))
  }
  return Math.max(3, maxSlot, connectedCount + 1)
}

export function formatTimeCode(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function reorderClips(
  clips: ComposeClipItem[],
  fromId: string,
  toIndex: number,
): ComposeClipItem[] {
  const fromIndex = clips.findIndex((c) => c.id === fromId)
  if (fromIndex < 0) return clips
  const next = [...clips]
  const [item] = next.splice(fromIndex, 1)
  const insertAt = Math.max(0, Math.min(toIndex, next.length))
  next.splice(insertAt, 0, item)
  return applySequentialStartTimes(next)
}
