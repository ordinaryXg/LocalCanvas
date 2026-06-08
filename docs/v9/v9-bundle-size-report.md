# v9 Renderer 包体对比报告

> 生成时间：2026-06-08 · 命令：`node scripts/report-bundle-size.mjs`

## 结论

✅ **首包（index chunk）较 v8 基线下降 64.2%**（≥ 8% 目标已达成）

| 指标 | 体积 |
|------|------|
| v8 基线（估算单包首屏） | 1480.0 KB |
| v9 首包 `index-R8Fu2x6K.js` | 529.7 KB |
| 懒加载分包合计（12 个） | 937.3 KB |
| renderer JS 总计 | 1467.0 KB |

## 分包明细（按体积降序）

| 文件 | 体积 | 加载方式 |
|------|------|----------|
| `index-R8Fu2x6K.js` | 529.7 KB | 首包 |
| `canvasStore-B6luKxeD.js` | 454.7 KB | React.lazy / 路由懒加载 |
| `Canvas-z0-zYYv-.js` | 331.6 KB | React.lazy / 路由懒加载 |
| `EditorShell-hv1dutsP.js` | 60.1 KB | React.lazy / 路由懒加载 |
| `SettingsPanel-BYIMKDCq.js` | 41.6 KB | React.lazy / 路由懒加载 |
| `WorkbenchMode-iTvPkzVe.js` | 9.8 KB | React.lazy / 路由懒加载 |
| `AgentPanel-D2OmSPcA.js` | 9.5 KB | React.lazy / 路由懒加载 |
| `editorShellStore-1JVMzDkj.js` | 8.4 KB | React.lazy / 路由懒加载 |
| `LegacyAppLayout-BFx_o5Gs.js` | 7.9 KB | React.lazy / 路由懒加载 |
| `ModelCapabilityBadges-DchIaCLD.js` | 4.7 KB | React.lazy / 路由懒加载 |
| `AgentCompanion-QIHGtn_T.js` | 3.7 KB | React.lazy / 路由懒加载 |
| `seedance-CyWpKT2Z.js` | 3.6 KB | React.lazy / 路由懒加载 |
| `useWorkbenchTarget-B6GgzvcL.js` | 1.7 KB | React.lazy / 路由懒加载 |

## 说明

- **v8 基线**存于 `scripts/bundle-baseline-v8.json`（`rendererMainKb`），可按历史构建实测更新。
- **首包**指 `index-*.js`：App 入口 + 未 lazy 的同步依赖。
- **懒加载分包**含 `EditorShell`、`Canvas`、`SettingsPanel`、`WorkbenchMode` 等，打开编辑器前不下载。
