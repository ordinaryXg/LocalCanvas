import { test, expect } from '@playwright/test'

test.describe('storyboard sync smoke', () => {
  test('storyboardSyncToCanvas module exports', async () => {
    const mod = await import('../src/utils/storyboardSyncToCanvas')
    expect(typeof mod.syncStoryboardToCanvas).toBe('function')
  })
})
