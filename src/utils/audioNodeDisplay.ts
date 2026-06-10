function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const AUDIO_CHIP_EMPTY_WIDTH = 160
export const AUDIO_CHIP_HEIGHT = 48
export const AUDIO_CHIP_MIN_WIDTH = 160
export const AUDIO_CHIP_MAX_WIDTH = 280
export const AUDIO_WAVEFORM_BAR_COUNT = 22

export function computeAudioChipWidth(
  durationSec: number | null | undefined,
  hasAudio: boolean,
): number {
  if (!hasAudio) return AUDIO_CHIP_EMPTY_WIDTH
  const base = 180
  if (durationSec == null || !Number.isFinite(durationSec) || durationSec <= 0) {
    return base
  }
  const extra = Math.min(100, Math.floor(durationSec / 10) * 4)
  return Math.min(AUDIO_CHIP_MAX_WIDTH, Math.max(AUDIO_CHIP_MIN_WIDTH, base + extra))
}

export function formatAudioDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** 由节点 id 生成稳定假波形高度（28–100） */
export function getAudioWaveformBars(nodeId: string, count = AUDIO_WAVEFORM_BAR_COUNT): number[] {
  const h = hashString(nodeId)
  return Array.from({ length: count }, (_, i) => {
    const mixed = (h ^ Math.imul(i + 1, 2654435761)) >>> 0
    return 28 + (mixed % 73)
  })
}
