import { watch, existsSync, type FSWatcher } from 'fs'
import type { AppConfig } from '../../../src/types/config'
import type { AdapterRegistry } from './model-adapter/factory'

export class ConfigWatcher {
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private onReload?: () => void

  constructor(
    private adapters: AdapterRegistry,
    private configPath: string,
    private loadConfig: (path: string) => AppConfig,
    onReload?: () => void,
  ) {
    this.onReload = onReload
  }

  start(): void {
    if (this.watcher || !existsSync(this.configPath)) return

    try {
      this.watcher = watch(this.configPath, () => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
          try {
            if (!existsSync(this.configPath)) return
            this.adapters.reloadFromConfig(this.loadConfig(this.configPath))
            this.onReload?.()
          } catch {
            // 配置文件可能处于写入中间态，忽略单次解析失败
          }
        }, 1000)
      })
    } catch {
      // 文件尚不可监听时跳过，config:reload IPC 仍可触发重载
    }
  }

  stop(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.watcher?.close()
    this.watcher = null
  }
}
