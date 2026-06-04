import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { parse } from 'yaml'
import { logger } from './logger'

export interface AppConfig {
  version: string
  dataPath: string
}

export function getAppConfig(): AppConfig {
  const configPath = join(app.getPath('userData'), 'LocalCanvas', 'config.yaml')
  const defaults: AppConfig = {
    version: '1.0.0',
    dataPath: join(app.getPath('userData'), 'LocalCanvas'),
  }

  if (!existsSync(configPath)) {
    return defaults
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = parse(raw) as Partial<AppConfig>
    return { ...defaults, ...parsed }
  } catch (error) {
    logger.warn('Failed to read config.yaml', error)
    return defaults
  }
}
