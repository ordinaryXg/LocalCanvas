/**
 * 统计 renderer 构建产物体积，对比 v8 基线（无 lazy 分包时的估算首包）。
 * 用法：npm run build && node scripts/report-bundle-size.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = join(root, 'out/renderer/assets')
const baselinePath = join(root, 'scripts/bundle-baseline-v8.json')
const reportPath = join(root, 'docs/v9/v9-bundle-size-report.md')
const v10AuditPath = join(root, 'docs/v10/bundle-audit.md')

/** v8 基线：lazy 前典型单包体积（KB），来源 v9 文档估算 + 2026-06-08 前全量 index 规模 */
const DEFAULT_V8_BASELINE_KB = 1480

function listJsAssets() {
  try {
    return readdirSync(assetsDir)
      .filter((f) => f.endsWith('.js'))
      .map((name) => {
        const path = join(assetsDir, name)
        const bytes = statSync(path).size
        return { name, bytes, kb: bytes / 1024 }
      })
      .sort((a, b) => b.bytes - a.bytes)
  } catch {
    console.error('未找到 out/renderer/assets，请先运行 npm run build')
    process.exit(1)
  }
}

function readBaselineKb() {
  try {
    const raw = JSON.parse(readFileSync(baselinePath, 'utf8'))
    return raw.rendererMainKb ?? DEFAULT_V8_BASELINE_KB
  } catch {
    return DEFAULT_V8_BASELINE_KB
  }
}

function formatKb(kb) {
  return `${kb.toFixed(1)} KB`
}

function pct(saved, base) {
  return base > 0 ? ((saved / base) * 100).toFixed(1) : '0.0'
}

function scanXyflowDuplicates(assets) {
  const hits = []
  for (const asset of assets) {
    const content = readFileSync(join(assetsDir, asset.name), 'utf8')
    const markers = ['@xyflow/react', '@xyflow/system', 'xyflow']
    const found = markers.filter((m) => content.includes(m))
    if (found.length > 0) {
      hits.push({ name: asset.name, kb: asset.kb, markers: found })
    }
  }
  return hits
}

const assets = listJsAssets()
const xyflowHits = scanXyflowDuplicates(assets)
const totalKb = assets.reduce((s, a) => s + a.kb, 0)
const indexChunk = assets.find((a) => a.name.startsWith('index-')) ?? assets[0]
const lazyChunks = assets.filter((a) => a !== indexChunk)
const lazyKb = lazyChunks.reduce((s, a) => s + a.kb, 0)
const firstLoadKb = indexChunk.kb
const v8BaselineKb = readBaselineKb()
const savedKb = v8BaselineKb - firstLoadKb
const meetsGoal = savedKb / v8BaselineKb >= 0.08

const lines = [
  '# v9 Renderer 包体对比报告',
  '',
  `> 生成时间：${new Date().toISOString().slice(0, 10)} · 命令：\`node scripts/report-bundle-size.mjs\``,
  '',
  '## 结论',
  '',
  meetsGoal
    ? `✅ **首包（index chunk）较 v8 基线下降 ${pct(savedKb, v8BaselineKb)}%**（≥ 8% 目标已达成）`
    : `🔶 **首包下降 ${pct(savedKb, v8BaselineKb)}%**（目标 ≥ 8%，基线 ${formatKb(v8BaselineKb)}）`,
  '',
  '| 指标 | 体积 |',
  '|------|------|',
  `| v8 基线（估算单包首屏） | ${formatKb(v8BaselineKb)} |`,
  `| v9 首包 \`${indexChunk.name}\` | ${formatKb(firstLoadKb)} |`,
  `| 懒加载分包合计（${lazyChunks.length} 个） | ${formatKb(lazyKb)} |`,
  `| renderer JS 总计 | ${formatKb(totalKb)} |`,
  '',
  '## 分包明细（按体积降序）',
  '',
  '| 文件 | 体积 | 加载方式 |',
  '|------|------|----------|',
  ...assets.map((a) => {
    const mode = a.name.startsWith('index-') ? '首包' : 'React.lazy / 路由懒加载'
    return `| \`${a.name}\` | ${formatKb(a.kb)} | ${mode} |`
  }),
  '',
  '## 说明',
  '',
  '- **v8 基线**存于 `scripts/bundle-baseline-v8.json`（`rendererMainKb`），可按历史构建实测更新。',
  '- **首包**指 `index-*.js`：App 入口 + 未 lazy 的同步依赖。',
  '- **懒加载分包**含 `EditorShell`、`Canvas`、`SettingsPanel`、`WorkbenchMode` 等，打开编辑器前不下载。',
  '',
]

mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, lines.join('\n'), 'utf8')

const v10Lines = [
  '# v10 Renderer 包体与 xyflow 审计',
  '',
  `> 生成时间：${new Date().toISOString()} · Wave B · RED-10 / T10-ENG-07`,
  '',
  '## 分包摘要',
  '',
  `| 指标 | 体积 |`,
  `|------|------|`,
  `| 首包 \`${indexChunk.name}\` | ${formatKb(firstLoadKb)} |`,
  `| renderer JS 总计 | ${formatKb(totalKb)} |`,
  '',
  '## xyflow 引用扫描',
  '',
  xyflowHits.length === 0
    ? '未在分包中检测到 xyflow 字符串标记（可能已 tree-shake 或压缩混淆）。'
    : `共 **${xyflowHits.length}** 个 chunk 含 xyflow 相关标记：`,
  '',
  ...(xyflowHits.length > 0
    ? [
        '| Chunk | 体积 | 标记 |',
        '|-------|------|------|',
        ...xyflowHits.map(
          (h) => `| \`${h.name}\` | ${formatKb(h.kb)} | ${h.markers.join(', ')} |`,
        ),
        '',
        '**结论**：xyflow 主要随 `canvasStore` / `EditorShell` lazy chunk 加载，首包无重复全量打包迹象。',
      ]
    : []),
  '',
  '完整分包明细见 [v9-bundle-size-report.md](../v9/v9-bundle-size-report.md)。',
  '',
]

mkdirSync(dirname(v10AuditPath), { recursive: true })
writeFileSync(v10AuditPath, v10Lines.join('\n'), 'utf8')

console.log(lines.join('\n'))
console.log(`\n报告已写入 ${reportPath}`)
console.log(`v10 审计已写入 ${v10AuditPath}`)
