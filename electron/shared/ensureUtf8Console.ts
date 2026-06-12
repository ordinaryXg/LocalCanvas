import { execSync } from 'child_process'

/** Windows 终端默认代码页非 UTF-8 时，中文日志会乱码 */
export function ensureUtf8Console(): void {
  if (process.platform !== 'win32') return
  try {
    execSync('chcp 65001 >nul', { stdio: 'ignore', windowsHide: true })
  } catch {
    /* ignore */
  }
  try {
    process.stdout?.setDefaultEncoding?.('utf8')
    process.stderr?.setDefaultEncoding?.('utf8')
  } catch {
    /* ignore */
  }
}
