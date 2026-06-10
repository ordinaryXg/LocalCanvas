# LocalCanvas v10 — 冗余清除与技术债归零

> **目标**：单路径 `EditorShell` + 技术债总表无 ⬜/🔶  
> **进度更新**：2026-06-10 · `npm test` **223** · `npm run build` ✅  
> **图例**：⬜ 未开始　🔶 部分完成　✅ 已完成

**关联**：[v9 收官](../../LocalCanvas_v9_精简优化与体验收官.md) · [v5 附录 A 用例](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) · [包体审计](./v10-bundle-audit.md)

---

## 一、定位与收官标准

| 主线 | 目标 |
|------|------|
| **冗余清除** | 删 Legacy/双轨/死依赖；主路径仅 `EditorShell` |
| **技术债归零** | 50 项总表全部 ✅；v5 P1 跑表 ≥80% |

| 指标 | 标准 | 状态 |
|------|------|------|
| V10-R0 冗余 | RED 清单全 ✅；Legacy `rg` 为 0 | 🔶 ENG-14 拆分未完成 |
| V10-R1 债务 | 50 项无 ⬜/🔶 | 🔶 约 **8** 项待关 |
| V10-R2 P1 | 23 项 P1 全 ✅ | ✅ |
| V10-R3 CI | test + build + e2e | 🔶 test/build ✅；e2e 待 Wave E |
| V10-R4 跑表 | `docs/v10-qa-run.md` P1 ≥80% | 🔶 骨架有，手工待填 |
| V10-R5 Legacy | ADR-001 移除落地 | ✅ |
| V10-R6 可维护 | 五文件拆分或说明 | 🔶 Canvas ✅；其余部分 |

---

## 二、Wave 进度

| Wave | 状态 | 摘要 |
|------|------|------|
| **A** | ✅ | Legacy 五文件删除；Slash/Generator 单路径；QA-02 N/A |
| **B** | 🔶 | Token 合并、xyflow 审计、ws 移除；大文件拆分部分 |
| **C** | ✅ | CAP-02~05、EXE-01、ENG-09~11、UI-12、QA-03；CAP-03 项目 Pin 于 D 补全 |
| **D** | 🔶 | 壳层/合成/分离 API/保存合并/单测/验收文档；UI-02·09 待收尾 |
| **E** | ⬜ | ENG-08 复核、e2e 收官、全表勾选 |

---

## 三、冗余清除（RED）

| ID | 项 | 状态 | 备注 |
|----|-----|------|------|
| RED-01~05 | Legacy 布局 / 双轨 / GeneratorPanel | ✅ | `App.tsx` 仅 `EditorShell` |
| RED-06 | 文本节点 legacy 字段 | 🔶 | `normalizeTextNodeData` + [迁移说明](./text-node-migration.md) |
| RED-07~09 | 死导出 / alias / 分镜 PDF | ✅ | v9 已关 |
| RED-10 | xyflow 打包 | ✅ | [v10-bundle-audit.md](./v10-bundle-audit.md) |
| RED-11 | main 死依赖 | 🔶 | `ws` 已删；`axios` 留 L2 sync |
| RED-12 | Token 双轨 | ✅ | `tokens.css` 语义层 |

**大文件拆分（ENG-14）**

| 文件 | 状态 |
|------|------|
| `Canvas.tsx` | ✅ `useCanvasSlash` 等 |
| `ModelSettingsSection.tsx` | 🔶 helpers 已拆 |
| `ImageEditorPanel` / `TextEditorPanel` / `ComposeEditor` | ⬜ |

```bash
rg "LegacyAppLayout|GenerateMode|EditMode|GeneratorPanel" src/ --glob "!**/*.test.*"
npm test && npm run build
```

---

## 四、技术债总表（50 项）

> v9 已关 7 项（UI-03、CAP-06/07、ENG-01/04/05、QA-01）。下表仅列**待跟踪**或近期变更项；未列出者均为 ✅。

### P0（4 项 · 待 1）

| ID | 项 | 状态 | 补全标准 |
|----|-----|------|----------|
| T10-CAP-11 | Token 合并 | ✅ | — |
| T10-ENG-02 | Legacy 移除 | ✅ | — |
| T10-QA-05 | v5 P1 跑表 | 🔶 | 填 `docs/v10-qa-run.md`，≥80% |

### P1（23 项 · 已清零）

CAP-02~07、EXE-01、ENG-03/09~11、UI-03/12、QA-02/03 均已 ✅。  
**T10-CAP-03**（catalog 展示 + 项目 `capabilityCatalogVersion` Pin）于 Wave D ✅。

### P2（23 项 · 待 6）

| ID | 项 | 状态 |
|----|-----|------|
| T10-UI-01 | 记住 canvas/workbench 模式 | ✅ |
| T10-UI-02 | Settings 四区 IA | 🔶 仍两 Tab |
| T10-UI-04 | Slash listbox a11y | ✅ |
| T10-UI-05 | Inspector 窄屏浮层 | ✅ |
| T10-UI-06 | TopBar 生成 Badge | ✅ |
| T10-UI-07 | dock-expand 动效 | ✅ |
| T10-UI-08 | 保存三态文案 | ✅ |
| T10-UI-09 | Toast 全覆盖 | 🔶 DAG 已补；连线等待审计 |
| T10-UI-10 | 1280×720 验收 | ✅ [归档](./v10-layout-1280.md) |
| T10-UI-11 | 启动页语气 | ✅ |
| T10-UI-13 | 图片 Drawer 1080p | ✅ [归档](./v10-image-drawer-1080p.md) |
| T10-UI-14 | Legacy `/style` | ✅ N/A |
| T10-CAP-01 | 合成 afade 淡入淡出 | ✅ |
| T10-CAP-08 | Custom Vision `images` | 🔶 adapter 已支持；缺 mock 单测 |
| T10-CAP-09 | L2 Anthropic/Google URL | ✅ |
| T10-CAP-10 | 能力徽章 i18n | ✅ |
| T10-EXE-02~05 | 分离 API / 配置 / Agent LLM / 账号文档 | ✅ [account-guide.md](../account-guide.md) |
| T10-ENG-06 | 文本 legacy 迁移 | 🔶 同 RED-06 |
| T10-ENG-07 | xyflow 审计 | ✅ |
| T10-ENG-12 | 自动保存 30s 合并 | ✅ |
| T10-ENG-13 | edge-compat profile 缓存 | ✅ |
| T10-ENG-14 | 大文件拆分 | 🔶 见 §三 |
| T10-QA-04 | agent/storyboard 单测 | ✅ |
| T10-QA-06 | 100 节点性能 | ✅ [归档](./v10-perf-100nodes.md) |

### P3（1 项）

| ID | 项 | 状态 |
|----|-----|------|
| T10-ENG-08 | main 依赖审计 | 🔶 Wave E 复核 axios 必要性 |

### 统计（2026-06-10）

| 优先 | ⬜ | 🔶 | ✅ | 合计 |
|------|----|----|-----|------|
| P0 | 0 | 1 | 3 | 4 |
| P1 | 0 | 0 | 23 | 23 |
| P2 | 0 | 6 | 17 | 23 |
| P3 | 0 | 1 | 0 | 1 |
| **合计** | **0** | **8** | **43** | **50** |

---

## 五、Wave E 待办（收官）

1. **T10-QA-05** — 手工跑 v5 P1，更新 `docs/v10-qa-run.md`
2. **T10-UI-02 / UI-09** — Settings 四 Tab；Toast 主路径审计
3. **T10-ENG-14 / RED-06** — 大文件与 legacy 类型收尾
4. **T10-ENG-08** — main 依赖最终说明
5. **CI** — `npm run test:e2e`；§二 RED + §四 全表改 ✅

---

## 六、ADR-001：Legacy 移除 ✅

删除 `LegacyAppLayout`、`GenerateMode`、`EditMode`、`GeneratorPanel`；主路径 `App.tsx` 仅 `EditorShell`。

---

## 七、不在 v10 范围

云端同步 · 3D/移动端/协作 · 分镜 PDF 恢复 · 商业人声分离深度接入（EXE-02 仅配置+adapter 骨架）

---

## 八、文档与触点索引

| 文档 | 用途 |
|------|------|
| [v10-qa-run.md](../v10-qa-run.md) | QA-05 跑表 |
| [v10-layout-1280.md](./v10-layout-1280.md) | UI-10 |
| [v10-image-drawer-1080p.md](./v10-image-drawer-1080p.md) | UI-13 |
| [v10-perf-100nodes.md](./v10-perf-100nodes.md) | QA-06 |
| [account-guide.md](../account-guide.md) | EXE-05 |
| [text-node-migration.md](./text-node-migration.md) | RED-06 |

**代码热点**：`EditorShell` · `TopBar` / `Dock` / `Inspector` · `SettingsPanel` · `useAutoSave` · `edge-compat` · `compose-service` · `vocal-separator` · `agent-service`

---

*v10 唯一待办源。收官时 §四 统计行全部为 ✅，Wave E 勾选完成。*
