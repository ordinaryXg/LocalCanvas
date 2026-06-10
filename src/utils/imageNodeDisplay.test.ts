import { describe, expect, it } from 'vitest'
import {
  computeImageDisplaySize,
  IMAGE_CANVAS_MAX_HEIGHT,
  IMAGE_CANVAS_MAX_WIDTH,
} from './imageNodeDisplay'

describe('computeImageDisplaySize', () => {
  it('caps tall images at max height', () => {
    const { width, height, clipped } = computeImageDisplaySize(800, 2000)
    expect(height).toBe(IMAGE_CANVAS_MAX_HEIGHT)
    expect(width).toBeLessThanOrEqual(IMAGE_CANVAS_MAX_WIDTH)
    expect(clipped).toBe(true)
  })

  it('scales wide images down', () => {
    const { width, height } = computeImageDisplaySize(1600, 900)
    expect(width).toBe(IMAGE_CANVAS_MAX_WIDTH)
    expect(height).toBeLessThanOrEqual(IMAGE_CANVAS_MAX_HEIGHT)
  })

  it('upsizes tiny square images to minimum', () => {
    const { width, height } = computeImageDisplaySize(64, 64)
    expect(width).toBeGreaterThanOrEqual(120)
    expect(height).toBeGreaterThanOrEqual(120)
  })
})
