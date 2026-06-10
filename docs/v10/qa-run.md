# v10 P1 跑表记录（T10-QA-05）

> 更新日期：2026-06-10 · Wave E  
> 用例来源：[v5 附录 A P1](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例)

## 自动化基线

| 检查项 | 结果 | 备注 |
|--------|------|------|
| `npm test` | ✅ 229/229 | 2026-06-10 Wave E |
| `npm run build` | ✅ | electron-vite |
| Legacy 主路径 | ✅ | `rg` 0 匹配 |
| e2e smoke | ✅ 7/7 | `npm run build && npm run test:e2e` |

## 手工 P1 跑表

| 类别 | 通过 | 失败 | 阻塞 | 待测 |
|------|------|------|------|------|
| 壳层 / 编辑器 | ✅ | — | — | — |
| 节点 / 生成 | ✅ | — | — | — |
| DAG / 分镜 | ✅ | — | — | — |
| Agent | — | — | — | **→ [v11](../v11/LocalCanvas_v11_Agent与设置增强.md)** |

**非 Agent 通过率**：100%（3/3 类，抽样 + 自动化基线）  
**整体 P1**：Agent 类用例已迁入 [v11 Agent 文档](../v11/LocalCanvas_v11_Agent与设置增强.md)，v10 以非 Agent ≥80% 达标。

## Wave E 已关项

- Settings 四 Tab IA（模型 / 默认 / 媒体与路径 / 界面）
- 连线失败 Toast（`onConnectEnd` + `describeConnectionReject`）
- Custom Vision `images` mock 单测（`custom-vision-request.test.ts`）
- main 依赖审计（[main-deps-audit.md](./main-deps-audit.md)）
- 文本 legacy 迁移（`normalizeTextNodeData` + 单测）
- TopBar getSnapshot 无限循环修复
