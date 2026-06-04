import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 0,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron-smoke',
      testMatch: /app\.spec\.ts/,
    },
    {
      name: 'compose-smoke',
      testMatch: /compose-smoke\.spec\.ts/,
    },
  ],
})
