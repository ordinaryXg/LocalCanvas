# LocalCanvas v10 — 冗余清除与技术债归零

> **版本目标**：**冗余代码清除** + **技术债归零** — 单路径 `EditorShell` 可维护  
> **周期**：3 周（5 Wave）· **状态**：✅ **v10 收官**（Agent 类待办已迁入 v11）  
> **详案**：[v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md)

---

## 两大主线

| 主线 | 要点 | 进度 |
|------|------|------|
| **冗余代码清除** | Legacy 移除、死依赖、大文件拆分 | ✅ Wave A~E |
| **技术债归零** | 50 项债务表；v5 P1 非 Agent ≥80% | ✅ |

## 成功标准（摘要）

| ID | 目标 | 状态 |
|----|------|------|
| V10-R0 | 主路径无 Legacy / RED 清单 | ✅ |
| V10-R1 | 债务表 50 项无 ⬜/🔶 | ✅ |
| V10-R2 | P1 债务 23 项 | ✅ |
| V10-R3 | test + build + e2e | ✅ 229 单测 · build · e2e 7/7 |
| V10-R4 | P1 跑表（非 Agent） | ✅ |
| V10-R5 | ADR-001 Legacy 移除 | ✅ |
| V10-R6 | 大文件拆分 | ✅ Canvas / Settings / 三大 Editor |

## Wave 一览

| Wave | 摘要 |
|------|------|
| A | Legacy 五文件删除；EditorShell 单路径 |
| B | Token 合并、xyflow 审计、`ws` 移除 |
| C | 能力徽章、DAG 恢复、视口/selector 优化 |
| D | Settings 四 Tab、连线 Toast、壳层收尾 |
| E | ENG-14 大面板拆分、e2e、依赖审计 |

## v10 关键交付

- **Settings 四 Tab**：模型 / 默认 / 媒体与路径 / 界面（`SettingsPanel` + 子组件）
- **Editor 拆分**：`useImageEditorPanel`、`useTextEditorSplit`、`useComposeEditor` + UI 子组件
- **稳定性**：TopBar Zustand selector 修复；`onConnectEnd` 连线失败 Toast；i18n JSON import 适配 e2e
- **测试基线**：`npm test` 229 · `npm run test:e2e` 7/7（需先 build）

## 迁入 v11（不在 v10 阻断）

| 项 | 文档 |
|----|------|
| Settings Agent 专 Tab / Skill 勾选 | [v11 Agent 待办](./v11/LocalCanvas_v11_Agent与设置增强.md) |
| QA-05 Agent 类 P1 手工跑表 | 同上 |
| EXE-05 Agent LLM 专章 | 同上 |

## 本版本文档

| 文档 | 路径 |
|------|------|
| 完整债务表 + Wave + RED | [v10/LocalCanvas_v10_项目优化与技术债归集.md](./v10/LocalCanvas_v10_项目优化与技术债归集.md) |
| P1 跑表 | [v10/qa-run.md](./v10/qa-run.md) |
| main 依赖审计 | [v10/main-deps-audit.md](./v10/main-deps-audit.md) |
| 文本节点迁移 | [v10/text-node-migration.md](./v10/text-node-migration.md) |
| 包体审计 | [v10/bundle-audit.md](./v10/bundle-audit.md) |
| **v11 待办** | [v11/LocalCanvas_v11_Agent与设置增强.md](./v11/LocalCanvas_v11_Agent与设置增强.md) |
| **目录说明** | [README.md](./README.md) |

```bash
npm test                      # 229 passed（2026-06-10）
npm run build                 # ✅
npm run build && npm run test:e2e   # e2e 7/7
rg "LegacyAppLayout|GeneratorPanel" src/   # 0 匹配
```

**关联**：[v9 收官](./LocalCanvas_v9_精简优化与体验收官.md) · [v5 测试用例 · 附录 A](./v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例)
