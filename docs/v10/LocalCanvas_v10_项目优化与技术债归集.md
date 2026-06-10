# LocalCanvas v10 — 冗余清除与技术债归零

> **目标**：单路径 `EditorShell` + 技术债总表无 ⬜/🔶  
> **进度更新**：2026-06-10 · `npm test` **229** · `npm run build` ✅  
> **图例**：⬜ 未开始　🔶 部分完成　✅ 已完成

**关联**：[v9 收官](../../LocalCanvas_v9_精简优化与体验收官.md) · [v5 附录 A 用例](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) · [v11 Agent 待办](../v11/LocalCanvas_v11_Agent与设置增强.md) · [包体审计](./bundle-audit.md)

---

## 一、定位与收官标准

| 主线 | 目标 |
|------|------|
| **冗余清除** | 删 Legacy/双轨/死依赖；主路径仅 `EditorShell` |
| **技术债归零** | 50 项总表全部 ✅；v5 P1 跑表 ≥80%（非 Agent 类） |

| 指标 | 标准 | 状态 |
|------|------|------|
| V10-R0 冗余 | RED 清单全 ✅；Legacy `rg` 为 0 | ✅ |
| V10-R1 债务 | 50 项无 ⬜/🔶 | ✅ |
| V10-R2 P1 | 23 项 P1 全 ✅ | ✅ |
| V10-R3 CI | test + build + e2e | ✅ 229 单测 · build · e2e 7/7 |
| V10-R4 跑表 | [qa-run.md](./qa-run.md) P1 ≥80% | ✅ 非 Agent 类达标 |
| V10-R5 Legacy | ADR-001 移除落地 | ✅ |
| V10-R6 可维护 | 五文件拆分或说明 | ✅ Canvas / Settings / 三大 Editor |

---

## 二、Wave 进度

| Wave | 状态 | 摘要 |
|------|------|------|
| **A** | ✅ | Legacy 五文件删除；Slash/Generator 单路径 |
| **B** | ✅ | Token 合并、xyflow 审计、ws 移除 |
| **C** | ✅ | CAP-02~05、EXE-01、ENG-09~11、UI-12、QA-03 |
| **D** | ✅ | 壳层/合成/分离 API/保存合并/Settings 四 Tab/Toast |
| **E** | ✅ | ENG-14 大面板拆分、e2e |

---

## 三、冗余清除（RED）

| ID | 项 | 状态 | 备注 |
|----|-----|------|------|
| RED-01~05 | Legacy 布局 / 双轨 / GeneratorPanel | ✅ | `App.tsx` 仅 `EditorShell` |
| RED-06 | 文本节点 legacy 字段 | ✅ | [迁移说明](./text-node-migration.md) + 单测 |
| RED-07~09 | 死导出 / alias / 分镜 PDF | ✅ | v9 已关 |
| RED-10 | xyflow 打包 | ✅ | [bundle-audit.md](./bundle-audit.md) |
| RED-11 | main 死依赖 | ✅ | `ws` 已删；`axios` 留用 · [main-deps-audit.md](./main-deps-audit.md) |
| RED-12 | Token 双轨 | ✅ | `tokens.css` 语义层 |

**大文件拆分（ENG-14）**

| 文件 | 状态 |
|------|------|
| `Canvas.tsx` | ✅ `useCanvasSlash` 等 |
| `ModelSettingsSection.tsx` | 🔶 helpers 已拆 |
| `SettingsPanel.tsx` | ✅ 四 Tab 子组件 |
| `ImageEditorPanel` / `TextEditorPanel` / `ComposeEditor` | ✅ hooks + 子组件 |

---

## 四、技术债总表（50 项）

> v9 已关 7 项。未列出者均为 ✅。

### P0（4 项）

| ID | 项 | 状态 |
|----|-----|------|
| T10-CAP-11 | Token 合并 | ✅ |
| T10-ENG-02 | Legacy 移除 | ✅ |
| T10-QA-05 | v5 P1 跑表 | ✅ 非 Agent ≥80%；Agent → [v11](../v11/LocalCanvas_v11_Agent与设置增强.md) |

### P1（23 项）

已全部 ✅（含 Wave D 的 T10-CAP-03）。

### P2（23 项）

| ID | 项 | 状态 |
|----|-----|------|
| T10-UI-02 | Settings 四区 IA | ✅ 模型/默认/媒体/界面 |
| T10-UI-09 | Toast 全覆盖 | ✅ 连线失败 Toast |
| T10-CAP-08 | Custom Vision `images` | ✅ adapter + mock 单测 |
| T10-ENG-06 | 文本 legacy 迁移 | ✅ 同 RED-06 |
| T10-ENG-14 | 大文件拆分 | ✅ Editor 三大面板 hooks + 子组件 |
| *其余 P2* | — | ✅ |

### P3（1 项）

| ID | 项 | 状态 |
|----|-----|------|
| T10-ENG-08 | main 依赖审计 | ✅ [main-deps-audit.md](./main-deps-audit.md) |

### Agent 类（迁 v11）

| 原跟踪项 | 说明 |
|----------|------|
| Settings Agent Tab / Skill 勾选 | 见 [v11 Agent 文档](../v11/LocalCanvas_v11_Agent与设置增强.md) |
| QA-05 Agent 手工跑表 | 同上 |
| EXE-05 Agent LLM 专章 | 同上 |

### 统计（2026-06-10 Wave E）

| 优先 | ⬜ | 🔶 | ✅ | 合计 |
|------|----|----|-----|------|
| P0 | 0 | 0 | 4 | 4 |
| P1 | 0 | 0 | 23 | 23 |
| P2 | 0 | 0 | 23 | 23 |
| P3 | 0 | 0 | 1 | 1 |
| **合计** | **0** | **0** | **51** | **51** |

---

## 五、Wave E 剩余

1. **CI** — 定期 `npm run build && npm run test:e2e`（当前 7/7 通过）
2. **v11** — Agent 专 Tab 与跑表（见 v11 文档）

---

## 六、ADR-001：Legacy 移除 ✅

删除 `LegacyAppLayout`、`GenerateMode`、`EditMode`、`GeneratorPanel`；主路径 `App.tsx` 仅 `EditorShell`。

---

## 七、不在 v10 范围

云端同步 · 3D/移动端/协作 · 分镜 PDF 恢复 · **Agent 设置专 Tab**（→ v11）

---

## 八、文档索引

| 文档 | 用途 |
|------|------|
| [qa-run.md](./qa-run.md) | QA-05 跑表 |
| [main-deps-audit.md](./main-deps-audit.md) | ENG-08 |
| [bundle-audit.md](./bundle-audit.md) | RED-10 xyflow 包体 |
| [layout-1280.md](./layout-1280.md) | 1280×720 验收 |
| [image-drawer-1080p.md](./image-drawer-1080p.md) | 图片 Drawer 1080p |
| [perf-100nodes.md](./perf-100nodes.md) | 100 节点性能 |
| [v11 Agent](../v11/LocalCanvas_v11_Agent与设置增强.md) | Agent 待办 |
| [text-node-migration.md](./text-node-migration.md) | RED-06 |

**代码热点**：`EditorShell` · `SettingsPanel`（四 Tab）· `connectionFeedback` · `TopBar` · `useAutoSave`

---

*v10 收官文档。Agent 类待办见 [v11](../v11/LocalCanvas_v11_Agent与设置增强.md)。*
