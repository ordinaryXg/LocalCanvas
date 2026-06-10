import { describe, expect, it } from 'vitest'
import {
  computeAudioChipWidth,
  formatAudioDuration,
  getAudioWaveformBars,
} from './audioNodeDisplay'

describe('audioNodeDisplay', () => {
  it('formats duration', () => {
    expect(formatAudioDuration(65)).toBe('1:05')
    expect(formatAudioDuration(null)).toBe('--:--')
  })

  it('widens chip for longer audio', () => {
    expect(computeAudioChipWidth(null, false)).toBe(160)
    expect(computeAudioChipWidth(30, true)).toBeGreaterThan(computeAudioChipWidth(5, true))
  })

  it('returns stable waveform bars', () => {
    expect(getAudioWaveformBars('audio-1')).toEqual(getAudioWaveformBars('audio-1'))
    expect(getAudioWaveformBars('audio-1').length).toBe(22)
  })
})
