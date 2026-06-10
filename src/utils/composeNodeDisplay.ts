import type { ComposeClipItem } from '../types/node'
import { formatTimeCode } from './composeSequence'

export const COMPOSE_STRIP_WIDTH = 248
export const COMPOSE_STRIP_EMPTY_HEIGHT = 64
export const COMPOSE_STRIP_MIN_HEIGHT = 72
export const COMPOSE_STRIP_MAX_HEIGHT = 96
export const COMPOSE_PILL_TRACK_HEIGHT = 28
export const COMPOSE_PILL_MIN_WIDTH = 12

export function composeEmptyHint(): string {
  return '0 段 · 双击剪辑'
}

export function composeFooterText(segmentCount: number, totalSec: number): string {
  return `${segmentCount} 段 · ${formatTimeCode(totalSec)}`
}

export function composeClipLabel(clip: ComposeClipItem, index: number): string {
  const name = clip.name?.trim()
  if (name) {
    return name.length > 2 ? name.slice(0, 2) : name
  }
  return String(index + 1)
}

/** flex-grow 权重：按时长比例，至少为 1 */
export function composeClipFlexWeight(clip: ComposeClipItem): number {
  const duration = clip.duration ?? 0
  return duration > 0 ? duration : 1
}
