import { resolve } from 'path'
import { cpSync, mkdirSync, unlinkSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/** 预加载脚本保持原始 CJS（require('electron')），勿走 Vite 打包 */
function copyPreloadPlugin(): Plugin {
  return {
    name: 'copy-preload-cjs',
    closeBundle() {
      const outDir = resolve(__dirname, 'out/preload')
      mkdirSync(outDir, { recursive: true })
      cpSync(resolve(__dirname, 'electron/preload/index.cjs'), resolve(outDir, 'index.cjs'))
      try {
        unlinkSync(resolve(outDir, 'index.js'))
      } catch {
        /* Vite 可能未生成 index.js */
      }
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
        external: ['electron'],
        output: {
          format: 'cjs',
          entryFileNames: 'index.cjs',
        },
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
