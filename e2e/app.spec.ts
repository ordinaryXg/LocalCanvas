import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const mainEntry = path.join(rootDir, '../out/main/index.js')

test.describe('LocalCanvas electron smoke', () => {
  test('packaged main process launches renderer', async () => {
    test.skip(!existsSync(mainEntry), 'Run npm run build before e2e')

    const { _electron: electron } = await import('playwright')
    const app = await electron.launch({ args: [mainEntry] })
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')
      await expect(window).toHaveTitle(/LocalCanvas/)
    } finally {
      await app.close()
    }
  })
})
