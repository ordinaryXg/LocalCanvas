# v10 Renderer 包体与 xyflow 审计

> 生成时间：2026-06-10T09:07:39.777Z · Wave B · RED-10 / T10-ENG-07

## 分包摘要

| 指标 | 体积 |
|------|------|
| 首包 `index-BBaqOuB7.js` | 530.6 KB |
| renderer JS 总计 | 1492.4 KB |

## xyflow 引用扫描

共 **1** 个 chunk 含 xyflow 相关标记：

| Chunk | 体积 | 标记 |
|-------|------|------|
| `canvasStore-MQTTJ62m.js` | 452.1 KB | @xyflow/react, @xyflow/system, xyflow |

**结论**：xyflow 主要随 `canvasStore` / `EditorShell` lazy chunk 加载，首包无重复全量打包迹象。

完整分包明细见 [v9-bundle-size-report.md](../v9/v9-bundle-size-report.md)。
