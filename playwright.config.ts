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
    {
      name: 'dag-smoke',
      testMatch: /dag-smoke\.spec\.ts/,
    },
    {
      name: 'storyboard-smoke',
      testMatch: /storyboard-export\.spec\.ts/,
    },
    {
      name: 'workbench-smoke',
      testMatch: /workbench-smoke\.spec\.ts/,
    },
  ],
})
