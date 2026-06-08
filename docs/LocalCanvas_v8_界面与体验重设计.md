# LocalCanvas v8 — 界面与体验重设计

> **版本目标**：EditorShell、三模式、Drawer、Inspector、Design Token 统一  
> **周期**：3 周 · **状态**：✅ 基线已落地（v9 合并为画布\|工作台）  
> **详案**：[v8/LocalCanvas_v8_界面与体验重设计.md](./v8/LocalCanvas_v8_界面与体验重设计.md)

---

## 核心交付

| 模块 | 要点 |
|------|------|
| EditorShell | 画布 / 生成 / 编辑三模式（v9 收敛为画布\|工作台） |
| 信息架构 | Dock、Inspector、GeneratorDrawer 职责划分 |
| 视觉 | `studio-*` Design Token、图片 ImageEditorPanel 重设计 |
| 交互 | mode-crossfade、drawer-slide、Slash 微反馈 |

## 验收摘要

- Dock 替代 5 Tab；Inspector 减少重复打开生成器
- Token 统一；详见详案 §十一 用户假设指标

## 本版本文档

| 文档 | 路径 |
|------|------|
| 完整详案 + 路线图 | [v8/LocalCanvas_v8_界面与体验重设计.md](./v8/LocalCanvas_v8_界面与体验重设计.md) |
| 视觉语言与设计令牌 | [v8/design/01_视觉语言与设计令牌.md](./v8/design/01_视觉语言与设计令牌.md) |
| 编辑器壳层与三模式 | [v8/design/02_编辑器壳层与三模式布局.md](./v8/design/02_编辑器壳层与三模式布局.md) |
| 交互语法与微反馈 | [v8/design/03_交互语法与微反馈.md](./v8/design/03_交互语法与微反馈.md) |
| Inspector 与 Drawer | [v8/design/04_Inspector与Drawer职责划分.md](./v8/design/04_Inspector与Drawer职责划分.md) |
| 图片节点重设计 | [v8/design/LocalCanvas_图片节点与生成器重设计.md](./v8/design/LocalCanvas_图片节点与生成器重设计.md) |

**说明**：v7 未单独发版，见 [v7/README.md](./v7/README.md)。
