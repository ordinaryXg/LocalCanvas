import { existsSync } from 'fs'

const FONT_CANDIDATES: Record<string, string[]> = {
  win32: [
    'C:/Windows/Fonts/msyh.ttc',
    'C:/Windows/Fonts/msyhbd.ttc',
    'C:/Windows/Fonts/simhei.ttf',
    'C:/Windows/Fonts/simsun.ttc',
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/segoeui.ttf',
  ],
  darwin: [
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
  ],
  linux: [
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ],
}

let cachedFontFile: string | null | undefined

/** FFmpeg drawtext 所需字体；Windows 无 fontfile 时会因 Fontconfig 崩溃 */
export function resolveDrawtextFontFile(): string | null {
  if (cachedFontFile !== undefined) return cachedFontFile

  const platform = process.platform in FONT_CANDIDATES ? process.platform : 'linux'
  for (const candidate of FONT_CANDIDATES[platform] ?? []) {
    if (existsSync(candidate)) {
      cachedFontFile = candidate
      return candidate
    }
  }
  cachedFontFile = null
  return null
}

/** 供 vitest 重置缓存 */
export function resetDrawtextFontCache(): void {
  cachedFontFile = undefined
}

export function escapeDrawtextFontPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:')
}

export function drawtextFontOption(): string {
  const fontFile = resolveDrawtextFontFile()
  if (!fontFile) return ''
  return `:fontfile='${escapeDrawtextFontPath(fontFile)}'`
}
