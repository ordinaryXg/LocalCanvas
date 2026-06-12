import { app } from 'electron'
import { join } from 'path'
import log from 'electron-log/main'
import { ensureUtf8Console } from '../../shared/ensureUtf8Console'

ensureUtf8Console()

log.initialize()
log.transports.file.resolvePathFn = () =>
  join(app.getPath('userData'), 'logs', 'main.log')

export const logger = log.scope('main')

if (process.env.NODE_ENV === 'development') {
  log.transports.console.level = 'debug'
} else {
  log.transports.console.level = 'info'
}
