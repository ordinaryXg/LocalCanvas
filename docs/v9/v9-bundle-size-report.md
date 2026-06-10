# v9 Renderer 包体对比报告

> 生成时间：2026-06-10 · 命令：`node scripts/report-bundle-size.mjs`

## 结论

✅ **首包（index chunk）较 v8 基线下降 64.2%**（≥ 8% 目标已达成）

| 指标 | 体积 |
|------|------|
| v8 基线（估算单包首屏） | 1480.0 KB |
| v9 首包 `index-BBaqOuB7.js` | 530.6 KB |
| 懒加载分包合计（10 个） | 961.8 KB |
| renderer JS 总计 | 1492.4 KB |

## 分包明细（按体积降序）

| 文件 | 体积 | 加载方式 |
|------|------|----------|
| `index-BBaqOuB7.js` | 530.6 KB | 首包 |
| `canvasStore-MQTTJ62m.js` | 452.1 KB | React.lazy / 路由懒加载 |
| `EditorShell-D-FcwBDl.js` | 185.2 KB | React.lazy / 路由懒加载 |
| `useWorkbenchTarget-CPBD77MH.js` | 168.5 KB | React.lazy / 路由懒加载 |
| `WorkbenchMode-BtU6YFg-.js` | 56.2 KB | React.lazy / 路由懒加载 |
| `SettingsPanel-oiI1XkKv.js` | 43.1 KB | React.lazy / 路由懒加载 |
| `useDagRun-Bvxl5qs5.js` | 25.4 KB | React.lazy / 路由懒加载 |
| `AgentCompanion-D0LvtyXZ.js` | 12.9 KB | React.lazy / 路由懒加载 |
| `editorShellStore-ocFLWUyY.js` | 9.1 KB | React.lazy / 路由懒加载 |
| `ModelCapabilityBadges-C-E1gZCU.js` | 4.7 KB | React.lazy / 路由懒加载 |
| `seedance-BjWkdHde.js` | 4.6 KB | React.lazy / 路由懒加载 |

## 说明

- **v8 基线**存于 `scripts/bundle-baseline-v8.json`（`rendererMainKb`），可按历史构建实测更新。
- **首包**指 `index-*.js`：App 入口 + 未 lazy 的同步依赖。
- **懒加载分包**含 `EditorShell`、`Canvas`、`SettingsPanel`、`WorkbenchMode` 等，打开编辑器前不下载。
