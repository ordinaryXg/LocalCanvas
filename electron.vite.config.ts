import { resolve } from 'path'
import { cpSync, mkdirSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

function copyPreloadPlugin(): Plugin {
  return {
    name: 'copy-preload-cjs',
    buildStart() {
      const outDir = resolve(__dirname, 'out/preload')
      mkdirSync(outDir, { recursive: true })
      cpSync(resolve(__dirname, 'electron/preload/index.cjs'), resolve(outDir, 'index.cjs'))
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyPreloadPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts'),
          utility: resolve(__dirname, 'electron/utility/index.ts'),
        },
        external: ['electron', 'better-sqlite3'],
      },
    },
  },
  preload: {
    plugins: [copyPreloadPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: resolve(__dirname, 'electron/preload/index.cjs'),
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
  },
})
