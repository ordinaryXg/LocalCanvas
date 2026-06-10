import type { ScriptRow } from '../types/node'

export const SCRIPT_STRIP_WIDTH = 220
export const SCRIPT_EMPTY_HEIGHT = 96
export const SCRIPT_MIN_HEIGHT = 96
export const SCRIPT_MAX_HEIGHT = 280
export const SCRIPT_BODY_MAX_HEIGHT = 200

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'] as const

export function scriptTotalDuration(rows: ScriptRow[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.duration) || 0), 0)
}

export function scriptSequenceGlyph(sequence: number): string {
  if (sequence >= 1 && sequence <= CIRCLED.length) {
    return CIRCLED[sequence - 1]!
  }
  return `${sequence}.`
}

export function formatScriptShotLine(row: ScriptRow, maxTextLen = 26): string {
  const raw = row.description?.trim() || row.prompt?.trim() || '未填写'
  const text = raw.length > maxTextLen ? `${raw.slice(0, maxTextLen)}…` : raw
  const camera =
    row.camera && row.camera !== '静止' ? ` · ${row.duration}s · ${row.camera}` : ` · ${row.duration}s`
  return `${scriptSequenceGlyph(row.sequence)} ${text}${camera}`
}

export function scriptFooterText(rowCount: number, totalSec: number): string {
  return `共 ${rowCount} 镜 · ${totalSec}s`
}

export function scriptEmptyHint(): string {
  return '0 镜 · 双击编辑'
}

export function truncateSynopsis(text: string, maxLen = 40): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen)}…`
}

export function scriptDisplayTitle(title: string | undefined): string {
  const trimmed = title?.trim()
  return trimmed || '分镜脚本'
}
