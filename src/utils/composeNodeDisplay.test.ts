import { describe, expect, it } from 'vitest'
import {
  composeClipFlexWeight,
  composeClipLabel,
  composeEmptyHint,
  composeFooterText,
} from './composeNodeDisplay'
import type { ComposeClipItem } from '../types/node'

describe('composeNodeDisplay', () => {
  it('formats empty hint and footer', () => {
    expect(composeEmptyHint()).toBe('0 段 · 双击剪辑')
    expect(composeFooterText(3, 42)).toBe('3 段 · 0:42')
  })

  it('labels clips by name or index', () => {
    expect(composeClipLabel({ id: 'a', duration: 1, name: '开场动画' }, 0)).toBe('开场')
    expect(composeClipLabel({ id: 'b', duration: 1 }, 2)).toBe('3')
  })

  it('weights pills by duration', () => {
    const clip: ComposeClipItem = { id: 'a', duration: 4.5 }
    expect(composeClipFlexWeight(clip)).toBe(4.5)
    expect(composeClipFlexWeight({ id: 'b', duration: 0 })).toBe(1)
  })
})
