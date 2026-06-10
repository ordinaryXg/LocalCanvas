import { describe, expect, it } from 'vitest'
import {
  computeVideoDisplaySize,
  emptyVideoDisplaySize,
  VIDEO_CANVAS_EMPTY_HEIGHT,
  VIDEO_CANVAS_EMPTY_WIDTH,
  VIDEO_CANVAS_MAX_WIDTH,
} from './videoNodeDisplay'

describe('videoNodeDisplay', () => {
  it('uses fixed 16:9 empty size', () => {
    const empty = emptyVideoDisplaySize()
    expect(empty.width).toBe(VIDEO_CANVAS_EMPTY_WIDTH)
    expect(empty.height).toBe(VIDEO_CANVAS_EMPTY_HEIGHT)
    expect(empty.width / empty.height).toBeCloseTo(16 / 9, 2)
  })

  it('caps wide video at max width', () => {
    const { width, height } = computeVideoDisplaySize(1920, 1080)
    expect(width).toBe(VIDEO_CANVAS_MAX_WIDTH)
    expect(height).toBeLessThanOrEqual(280)
  })

  it('caps tall video and marks clipped', () => {
    const { height, clipped } = computeVideoDisplaySize(1080, 1920)
    expect(height).toBe(280)
    expect(clipped).toBe(true)
  })
})
