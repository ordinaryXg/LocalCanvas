import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: [
        'src/utils/projectPayload.ts',
        'src/utils/dataFlow.ts',
        'src/utils/workflow.ts',
        'src/utils/portCompat.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 74,
        statements: 80,
      },
    },
  },
})
