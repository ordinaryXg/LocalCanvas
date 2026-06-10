# LocalCanvas v10 — 冗余清除与技术债归零

> **版本目标**：**主线一 冗余代码清除** + **主线二 技术债归零** — 不新增大型业务能力  
> **预计周期**：3 周（15 个工作日，双主线 × 5 Wave）  
> **前置条件**：v9 四波 + Wave 5 已落地；`npm test`（**210**）与 `npm run build` 通过  
> **生成日期**：2026-06-08（v10 定稿：双主线）  
> **立场**：v10 **不做方向选择题** — 先删冗余、再逐项还清 §三；收官标准 = **单路径代码库 + 总表无 ⬜/🔶**

**图例**：⬜ 未开始　🔶 部分完成（须写清补全标准）　✅ 已完成（含 v9 关闭）　**废弃** 产品已移除（不纳入 v10 待办）

**关联文档**：[v9 收官](../../LocalCanvas_v9_精简优化与体验收官.md) · [v5 测试用例 · 附录 A](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) · [v9 包体报告](../v9/v9-bundle-size-report.md)

---

## 〇、版本定位

### 0.1 与 v9 的关系

| v9 已交付 | v10 必须完成 |
|-----------|--------------|
| 包体 lazy、R2 报告、e2e 5 条、工作台、分镜 Wave 5、死代码一批 | **删尽冗余**（Legacy / 双轨 / 死文件） |
| P1 约 85%（含部分） | **技术债归零**：§三 剩余 **43** 项全 ✅ |
| Wave 5 已移除 PDF 导出等冗余能力 | v10 不再恢复已废弃项（如分镜 PDF） |

v10 不做新功能扩张；**冗余清除**与**债务关闭**均须有代码/测试/文档证据。

### 0.2 两大主线（已定）

| 主线 | 一句话 | 主要产出 | 关联章节 |
|------|--------|----------|----------|
| **1. 冗余代码清除** | 删 Legacy、并双轨、清死代码与死依赖、拆大文件 | 主路径仅 `EditorShell`；`rg` 审计通过；维护面最小 | §二、§三 Wave A–B、T10-ENG-* |
| **2. 技术债归零** | §三 43 项待办逐项关闭 + v5 P1 跑表 | 50 项总表无 ⬜/🔶；`v10-qa-run.md` 归档 | §三、Wave 0/C–E、T10-UI/CAP/EXE/QA-* |

**排期原则**：Wave 0 门禁 → **先冗余（Wave A–B）** → **再债务 P0/P1（Wave C）** → P2/P3 与验收（Wave D–E）。两主线可并行，但 **Legacy 移除（ENG-02）须早于** Slash/Generator 收敛与 Legacy smoke 关项。

### 0.3 成功标准（v10 收官）

| ID | 指标 | 目标 |
|----|------|------|
| **V10-R0** | 冗余清除 | Legacy 主路径 0 引用；§二 清除清单全 ✅；5 大文件拆分完成或说明 |
| **V10-R1** | 债务归零 | §三 **43 项待办全部 ✅**；总表 50 项无 ⬜/🔶 |
| **V10-R2** | P1 门禁 | P1（23 项）**100%** 关闭 |
| **V10-R3** | 质量 | `npm test` 全绿；`npm run build` 通过；e2e smoke **≥ 6**（或 Legacy 移除后 ≥5 + 说明） |
| **V10-R4** | 用例 | v5 附录 A P1 **≥ 80%** 通过，跑表记录归档 |
| **V10-R5** | Legacy | ADR-001 **移除**落地 + smoke/N/A 关项 |
| **V10-R6** | 可维护 | §二 五文件拆分（T10-ENG-14）或单项验收说明 |

---

## 二、主线一：冗余代码清除清单

> 与 §三 债务表交叉引用；**清除项优先于**同主题债务补全（例如先删 Legacy，再关 ENG-03 / UI-14）。

### 2.1 架构冗余（双轨 → 单轨）

| ID | 项 | 路径 / 范围 | 状态 | 验收 |
|----|-----|-------------|------|------|
| RED-01 | Legacy 布局根 | `LegacyAppLayout.tsx` | ⬜ | 删除；`App.tsx` 仅 `EditorShell` |
| RED-02 | 废弃模式 | `GenerateMode.tsx`、`EditMode.tsx` | ⬜ | 删除（已无引用） |
| RED-03 | 画布内 Generator 浮层 | `GeneratorPanel.tsx` | ⬜ | 删除或仅测试替身；生成统一 `GeneratorDrawer` / `WorkbenchMode` |
| RED-04 | Legacy 环境开关 | `isLegacyLayoutForced()`、`VITE_LEGACY_LAYOUT` | 🔶 | 移除或仅迁移期提示一页 |
| RED-05 | Slash `/style` 双路径 | Legacy vs EditorShell | 🔶 | 单路径 focus chips（T10-ENG-03 / T10-UI-14） |

**关联债务**：T10-ENG-02、T10-ENG-03、T10-UI-14、T10-QA-02 · **ADR-001**

### 2.2 死代码与类型遗留

| ID | 项 | 路径 | 状态 | 验收 |
|----|-----|------|------|------|
| RED-06 | 文本节点 legacy 字段 | `types/node.ts` | 🔶 | 加载迁移 + 文档（T10-ENG-06） |
| RED-07 | 未使用 main 导出 | `getAppConfig` 等 | ✅ | v9 已删 |
| RED-08 | deprecated alias | `textNodePromptOutput` | ✅ | v9 已删 |
| RED-09 | 分镜 PDF 管线 | `exportStoryboardPdf`、IPC `pdf` | ✅ | v9 Wave 5 已移除 |

### 2.3 依赖与包体冗余

| ID | 项 | 说明 | 状态 | 验收 |
|----|-----|------|------|------|
| RED-10 | xyflow 重复打包 | rollup / bundle 报告 | ⬜ | T10-ENG-07 报告归档 |
| RED-11 | main 死依赖 | `axios`/`ws` 等 | ⬜ | T10-ENG-08 `package.json` 精简 |
| RED-12 | Token 双轨 | `--color-*` vs `--studio-*` | 🔶 | T10-CAP-11 语义层合并 |

### 2.4 大文件拆分（减维护面 · T10-ENG-14）

| 文件 | ~行数 | 拆出模块 | 状态 |
|------|-------|----------|------|
| `ModelSettingsSection.tsx` | ~593 | `ModelList` / `CapabilityDetail` / `ProbePanel` | ⬜ |
| `ImageEditorPanel.tsx` | ~530 | `ImagePreviewColumn` / `ImageParamsColumn` | ⬜ |
| `TextEditorPanel.tsx` | ~416 | `TextDraftPane` / `TextOutputPane` / `ReasoningBlock` | ⬜ |
| `Canvas.tsx` | ~550 | `useCanvasSlash` / `useCanvasDag` hooks | ⬜ |
| `ComposeEditor.tsx` | ~440 | `useComposeTimeline` hook | ⬜ |

### 2.5 冗余清除验收（V10-R0）

```bash
# 主路径不得再引用 Legacy / 旧 Generator
rg "LegacyAppLayout|GenerateMode|EditMode|GeneratorPanel" src/ --glob "!**/*.test.*"

npm run build
npm run report:bundle   # 可选：对比 Legacy 删除后体积
```

---

## 三、主线二：技术债总表（50 项 · 43 项待归零）

> v9 已关 **7 项**（✅：UI-03、CAP-06/07、ENG-01/04/05、QA-01）；下表对待办项给出**具体任务**与**验收标准**。

### 3.1 界面与壳层（14 项 · 待办 13）

| ID | 子功能 | 优先 | 状态 | v10 必做（任务） | 验收标准 |
|----|--------|------|------|------------------|----------|
| T10-UI-01 | 记住上次模式 | P2 | ⬜ | `editorShellStore.mode` 写入 `localStorage`；启动恢复 `canvas/workbench` | 重启后模式保持；单测或 e2e 断言 |
| T10-UI-02 | Settings 能力卡片化 IA | P2 | 🔶 | 拆 Tab 为「模型 / 能力 / 应用 / 高级」；`ModelSettingsSection` 卡片列表 | 设置页无长滚动墙；每能力一卡可探测 |
| T10-UI-03 | 工作台独立预览 | P1 | ✅ | — | v9 `WorkbenchNodePreview` |
| T10-UI-04 | Slash `listbox` a11y | P2 | 🔶 | `SlashCommandPalette` 加 `role=listbox`/`option`、`aria-activedescendant` | axe/手工：键盘导航可读 |
| T10-UI-05 | `<1280px` Inspector overlay | P2 | ⬜ | `EditorShell` 窄屏时 Inspector `fixed` 浮层 + 遮罩 | 1280 宽下画布与 Inspector 不重叠 |
| T10-UI-06 | 生成中 TopBar 进度 Badge | P2 | ⬜ | 订阅生成中节点；Drawer 收起时 TopBar 显示 `生成中 n%` | 收起 Drawer 仍可见进度 |
| T10-UI-07 | `dock-expand` 动效 | P2 | ⬜ | `Dock.tsx` 展开/收起 `180ms` + reduced-motion | 与 `drawer-slide` 一致策略 |
| T10-UI-08 | 保存状态 TopBar 统一 | P2 | 🔶 | 统一「已保存 / 保存中 / 失败」文案与色 token | 三种状态可触发并目检 |
| T10-UI-09 | Toast 场景全覆盖 | P2 | 🔶 | 审计 DAG 失败、连线阻断、批量断开；补 `showToast` | grep 主路径无静默失败 |
| T10-UI-10 | 1280×720 布局验收 | P2 | ⬜ | 最小窗口录屏/截图归档 `docs/v10-layout-1280.md` | 无重叠、可完成开项目+生成 |
| T10-UI-11 | 启动页语气统一 | P2 | ⬜ | `StartPage` 空状态/卡片副文案统一 studio 语气 | 与设计 token 一致 |
| T10-UI-12 | zinc 硬编码 → token | P1 | ⬜ | `ModeSwitcher`、`AgentCompanion` 改 `--studio-*` | `rg zinc-` 壳层组件为 0 |
| T10-UI-13 | 图片 Drawer 零滚动 1080p | P2 | 🔶 | `ImageEditorPanel` 1080p 一屏验收；必要时缩预览默认高 | 验收记录入 `docs/` |
| T10-UI-14 | Legacy `/style` 对齐 | P2 | 🔶 | Legacy 路径 `/style` → 打开 Generator 并 focus chips；或随 Legacy 移除关闭 | Legacy smoke 可演示 |

### 3.2 能力系统与节点（11 项 · 待办 9）

| ID | 子功能 | 优先 | 状态 | v10 必做（任务） | 验收标准 |
|----|--------|------|------|------------------|----------|
| T10-CAP-01 | 合成音频淡入淡出 | P2 | ⬜ | FFmpeg `afade` 入出点；`ComposeInspector` 可选秒数 | 导出片头片尾可听出淡入淡出 |
| T10-CAP-02 | 连线健康 Dock 总览 | P1 | 🔶 | Dock 增「健康」抽屉：虚线边列表、跳转、批量断开 | 与 `ProjectSummary` 数据一致 |
| T10-CAP-03 | 能力 Pin / catalog version | P1 | ⬜ | 项目级 pinned profiles + catalog 版本戳；设置页展示 | 换 catalog 后提示重探 |
| T10-CAP-04 | `reasoning_content` 折叠 | P1 | ⬜ | `TextEditorPanel` 输出区折叠块展示 reasoning | 有 reasoning 的模型可展开/收起 |
| T10-CAP-05 | 图片 `reference1…4` 端口 | P1 | ⬜ | `getImageNodePorts` 对齐 Seedream 多槽；`edge-compat` 更新 | 单测覆盖 4 参考入边 |
| T10-CAP-06 | 不合规入边一键断开 | P1 | ✅ | — | v9 `ProjectSummary` |
| T10-CAP-07 | 重开项目 compat 重评估 | P1 | ✅ | — | v9 `refreshEdgeCompatStyles` |
| T10-CAP-08 | Custom Vision `images` | P2 | ⬜ | adapter 支持多图 content 数组 | 单测 + 一条 mock 生成 |
| T10-CAP-09 | L2 Anthropic / Google | P2 | ⬜ | `l2-sync` 补全 profile 字段映射 | registry 单测通过 |
| T10-CAP-10 | 能力徽章双语 | P2 | ⬜ | `ModelCapabilityBadges` + 拒绝原因 i18n key | 中英文切换可见 |
| T10-CAP-11 | Token 双轨合并 | P0 | 🔶 | 产出 `tokens.css` 语义层；迁移 `--color-*` → `--studio-*` | 新改文件零 `--color-`（除兼容层） |

### 3.3 执行、Agent 与账号（5 项 · 待办 5）

| ID | 子功能 | 优先 | 状态 | v10 必做（任务） | 验收标准 |
|----|--------|------|------|------------------|----------|
| T10-EXE-01 | DAG 崩溃恢复弹窗 | P1 | ⬜ | `App.tsx` 启动 `dag:recover` 非空 → 确认继续/放弃 | 手工：杀进程后重启可见弹窗 |
| T10-EXE-02 | 人声分离 HTTP API | P2 | ⬜ | utility adapter 接分离 API（配置 endpoint） | IPC 可调通（可 mock） |
| T10-EXE-03 | Agent 默认模型 UI | P2 | ⬜ | Settings 选默认 agent 模型写入 config | 新会话用默认模型 |
| T10-EXE-04 | 分离 API 配置 UI | P2 | ⬜ | Settings 表单项 + `config.yaml` 读写 | 保存后重启保留 |
| T10-EXE-05 | `account-guide.md` | P2 | ⬜ | 撰写账号/游客/昵称说明 | 文档链接自 Settings/About |

### 3.4 工程、性能与架构（14 项 · 待办 11；✅ 3）

| ID | 子功能 | 优先 | 状态 | v10 必做（任务） | 验收标准 |
|----|--------|------|------|------------------|----------|
| T10-ENG-01 | 包体对比报告 | P0 | ✅ | — | v9 报告 |
| T10-ENG-02 | Legacy 双轨决策落地 | P0 | 🔶 | **决策：移除**；删 `LegacyAppLayout`、`GenerateMode`、`EditMode`、`GeneratorPanel` 或仅保留 `VITE_LEGACY_LAYOUT=1` 隔离构建 | `rg LegacyAppLayout` 主路径 0；ADR 记入本文 §五 |
| T10-ENG-03 | `/style`、Generator 收敛 | P1 | 🔶 | 随 ENG-02：Slash 只走 EditorShell；或 Legacy 删除 | e2e 覆盖主路径 |
| T10-ENG-04 | `getAppConfig` 删除 | P1 | ✅ | — | v9 |
| T10-ENG-05 | `textNodePromptOutput` 删除 | P1 | ✅ | — | v9 |
| T10-ENG-06 | 文本节点 legacy 类型 | P2 | 🔶 | `types/node.ts` 标记废弃字段；加载时迁移；文档迁移表 | 旧项目打开无报错 |
| T10-ENG-07 | xyflow 重复打包审计 | P2 | ⬜ | `report-bundle-size` 增 duplicate 分析或 rollup visualizer 报告 | 报告归档 `docs/` |
| T10-ENG-08 | main 依赖审计 | P3 | ⬜ | 列出 `axios`/`ws` 引用；删无用依赖 | `package.json` 无死依赖 |
| T10-ENG-09 | 视口外节点简化 | P1 | ⬜ | 视口外节点 `hidden` 或缩略模式 | 100 节点平移主观流畅 |
| T10-ENG-10 | 视口外 video 卸载 | P1 | ⬜ | `VideoNode` 离屏 `pause` + revoke blob | 多视频项目内存不飙 |
| T10-ENG-11 | Zustand 窄 selector | P1 | ⬜ | 热点组件改 selector + `shallow`（Canvas、Inspector） | 无 `useCanvasStore()` 裸订阅 |
| T10-ENG-12 | 自动保存 debounce | P2 | ⬜ | 脏标记合并 30s 窗口；避免连写 | 日志可见合并保存 |
| T10-ENG-13 | Registry profile 缓存 | P2 | ⬜ | `edge-compat` resolve 按 modelId 缓存 | 连线卡顿可感知下降 |
| T10-ENG-14 | 大文件拆分 | P2 | ⬜ | 完成 §二 五文件拆分 | 每文件 <350 行或 PR 说明 |

### 3.5 测试与验收（6 项 · 待办 4）

| ID | 子功能 | 优先 | 状态 | v10 必做（任务） | 验收标准 |
|----|--------|------|------|------------------|----------|
| T10-QA-01 | e2e 第 5 条 | P1 | ✅ | — | `workbench-smoke` |
| T10-QA-02 | Legacy smoke | P1 | ⬜ | `e2e/legacy-smoke.spec.ts` 或 Legacy 移除后标 N/A 并关项 | CI 绿或债务关闭说明 |
| T10-QA-03 | auth-service 单测 | P1 | 🔶 | `electron/main/services/auth-service.test.ts` 覆盖 register/login | vitest 主进程或抽取纯函数测 |
| T10-QA-04 | agent/storyboard 单测 | P2 | ⬜ | `parseWorkflowPlan` / storyboard 边界用例 | +2 测试文件 |
| T10-QA-05 | v5 P1 跑表 | P0 | ⬜ | 按 [v5 附录 A](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例) 跑 P1；结果写入 `docs/v10-qa-run.md` | ≥80% 通过 |
| T10-QA-06 | 100 节点性能归档 | P2 | 🔶 | 录屏 + 简述；关联 ENG-09/10 | `docs/v10-perf-100nodes.md` |

### 3.6 债务统计（v10 启动基线）

| 优先级 | ⬜ | 🔶 | ✅ | 合计 | v10 须清零 |
|--------|----|----|-----|------|------------|
| P0 | 1 | 2 | 1 | 4 | **3** |
| P1 | 10 | 6 | 7 | 23 | **16** |
| P2 | 18 | 5 | 0 | 23 | **23** |
| P3 | 1 | 0 | 0 | 1 | **1** |
| **合计** | **30** | **13** | **7** | **50** | **43** |

> 注：统计含 🔶 补全项；收官时 §三 状态列全部为 ✅。

---

## 四、实施路线图（双主线 · 5 Wave）

> **Wave A–B = 冗余代码清除** · **Wave 0 + C–E = 技术债归零**

### Wave 0 — 基线与门禁（2 天）· 债务

| 序 | 任务 ID | 内容 |
|----|---------|------|
| 0.1 | T10-QA-05 | v5 P1 跑表，产出缺口清单 → `docs/v10-qa-run.md` |
| 0.2 | RED-01~05 | **冗余审计**：`rg` 列出 Legacy/双轨引用清单 |
| 0.3 | T10-ENG-02 | **Legacy 决策：移除**（写入 §六 ADR-001） |
| 0.4 | — | 建立 v10 进度表（§五），冗余项与债务项分别勾选 |

**出口**：跑表完成；Legacy 策略签字；Wave A 可开工。

### Wave A — 冗余：Legacy 与双轨拆除（3 天）

| 序 | 任务 ID | 内容 |
|----|---------|------|
| A.1 | RED-01~03 / T10-ENG-02 | 删除 `LegacyAppLayout`、`GenerateMode`、`EditMode`、`GeneratorPanel` |
| A.2 | RED-04 | 移除 Legacy 开关与 `localStorage` 迁移提示（或保留一页说明后删） |
| A.3 | RED-05 / T10-ENG-03 | Slash、Generator 单路径收敛至 EditorShell |
| A.4 | T10-QA-02 | Legacy smoke → **N/A 关项**（移除后）或最后一轮 smoke |

**出口**：V10-R5 ✅；`rg LegacyAppLayout` 主路径为 0。

### Wave B — 冗余：死代码、依赖、大文件（4 天）

| 序 | 任务 ID | 内容 |
|----|---------|------|
| B.1 | RED-06 / T10-ENG-06 | 文本节点 legacy 类型迁移 |
| B.2 | RED-10~11 / T10-ENG-07/08 | xyflow 打包审计 + main 依赖精简 |
| B.3 | RED-12 / T10-CAP-11 | Token 双轨合并为语义层 |
| B.4 | §2.4 / T10-ENG-14 | 5 大文件拆分（可与 Wave C 并行） |

**出口**：V10-R0 ✅；包体/依赖报告归档（可选）。

### Wave C — 债务：P0 + P1 清零（4 天）

| 序 | 任务 ID | 内容 |
|----|---------|------|
| C.1 | T10-QA-05 | 按跑表结果修 P0/P1 阻断项 |
| C.2 | T10-CAP-02~05 | Dock 健康、能力 Pin、reasoning、多参考端口 |
| C.3 | T10-EXE-01 | DAG 崩溃恢复弹窗 |
| C.4 | T10-ENG-09/10/11 | 视口外节点 / video / Zustand selector |
| C.5 | T10-UI-12 | zinc → token |
| C.6 | T10-QA-03 | auth-service 单测 |

**出口**：P0 全 ✅；P1 23 项全 ✅（V10-R2）。

### Wave D — 债务：P2 体验与壳层（4 天）

| 序 | 任务 ID | 内容 |
|----|---------|------|
| D.1 | T10-UI-01~11 | 壳层、a11y、响应式、微反馈 |
| D.2 | T10-UI-13 | 图片 Drawer 1080p 零滚动验收 |
| D.3 | T10-CAP-01/08/09/10 | 合成淡入淡出 + 适配 + i18n |
| D.4 | T10-EXE-02~05 | 分离 API + Agent 设置 + account-guide |
| D.5 | T10-ENG-12/13 | 保存 debounce、Registry 缓存 |
| D.6 | T10-QA-04/06 | 补单测 + 100 节点性能归档 |

**出口**：P2 23 项全 ✅。

### Wave E — 收官验收（2 天）

| 序 | 任务 ID | 内容 |
|----|---------|------|
| E.1 | T10-ENG-08 | P3 main 依赖审计（若 Wave B 未关） |
| E.2 | — | §二 冗余清单 + §三 债务表复核：全部 ✅ |
| E.3 | — | `npm test` + `npm run build` + `npm run test:e2e` |
| E.4 | — | 更新 v9/v10 文档；CHANGELOG v10 |

**出口**：V10-R0～R6 全绿。

---

## 五、待办勾选表

> **§5.1 冗余清除** · **§5.2 技术债归零** — 实施时按 Wave 顺序勾选。

### 5.1 冗余代码清除（RED + ENG 清除项）

- [ ] RED-01 LegacyAppLayout 删除
- [ ] RED-02 GenerateMode / EditMode 删除
- [ ] RED-03 GeneratorPanel 删除
- [ ] RED-04 Legacy 开关移除
- [ ] RED-05 Slash/Generator 单路径
- [ ] RED-06 文本 legacy 类型迁移
- [ ] RED-10 xyflow 打包审计
- [ ] RED-11 main 死依赖清理
- [ ] RED-12 Token 双轨合并
- [ ] §2.4 五文件拆分（T10-ENG-14）
- [x] RED-07 getAppConfig（v9）
- [x] RED-08 textNodePromptOutput alias（v9）
- [x] RED-09 分镜 PDF 管线（v9 Wave 5）

### 5.2 技术债归零 — P0（3 项）

- [ ] T10-CAP-11 Token 双轨合并
- [ ] T10-ENG-02 Legacy 移除落地
- [ ] T10-QA-05 v5 P1 跑表 + 阻断修复

### 5.2 技术债归零 — P1（16 项）

- [ ] T10-CAP-02 Dock 健康总览
- [ ] T10-CAP-03 能力 Pin / catalog version
- [ ] T10-CAP-04 reasoning 折叠
- [ ] T10-CAP-05 图片多参考端口
- [ ] T10-EXE-01 DAG 崩溃恢复弹窗
- [ ] T10-ENG-03 Generator/Slash 收敛
- [ ] T10-ENG-09 视口外节点简化
- [ ] T10-ENG-10 视口外 video 卸载
- [ ] T10-ENG-11 Zustand 窄 selector
- [ ] T10-UI-12 zinc → token
- [ ] T10-QA-02 Legacy smoke 或 N/A 关项
- [ ] T10-QA-03 auth-service 单测

### 5.2 技术债归零 — P2（22 项）

- [ ] T10-UI-01 记住上次模式
- [ ] T10-UI-02 Settings 卡片化
- [ ] T10-UI-04 Slash listbox
- [ ] T10-UI-05 Inspector overlay
- [ ] T10-UI-06 TopBar 生成 Badge
- [ ] T10-UI-07 dock-expand
- [ ] T10-UI-08 保存状态文案
- [ ] T10-UI-09 Toast 全覆盖
- [ ] T10-UI-10 1280×720 验收
- [ ] T10-UI-11 启动页语气
- [ ] T10-UI-13 图片零滚动
- [ ] T10-UI-14 Legacy `/style`
- [ ] T10-CAP-01 音频淡入淡出
- [ ] T10-CAP-08 Custom Vision images
- [ ] T10-CAP-09 L2 Anthropic/Google
- [ ] T10-CAP-10 能力徽章双语
- [ ] T10-EXE-02 人声分离 API
- [ ] T10-EXE-03 Agent 默认模型 UI
- [ ] T10-EXE-04 分离 API 配置 UI
- [ ] T10-EXE-05 account-guide.md
- [ ] T10-ENG-06 文本 legacy 类型迁移
- [ ] T10-ENG-07 xyflow 打包审计
- [ ] T10-ENG-12 自动保存 debounce
- [ ] T10-ENG-13 Registry 缓存
- [ ] T10-ENG-14 大文件拆分
- [ ] T10-QA-04 agent/storyboard 单测
- [ ] T10-QA-06 100 节点性能归档

### 5.2 技术债归零 — P3（1 项）

- [ ] T10-ENG-08 main 依赖审计

### 🔶 补全标准速查（13 项须在勾选时关闭）

| ID | 当前缺口 | 补全即 ✅ 的条件 |
|----|----------|----------------|
| T10-UI-02 | 两 Tab | 四区 IA + 能力卡 |
| T10-UI-04 | 无 listbox | aria 完整 |
| T10-UI-08 | 文案不全 | 三态齐全 |
| T10-UI-09 | 部分路径 | DAG/连线有 Toast |
| T10-UI-13 | 未验收 | 1080p 记录归档 |
| T10-UI-14 | Legacy 无 /style | 对齐或随 Legacy 删除关项 |
| T10-CAP-02 | 仅摘要 | Dock 健康抽屉 |
| T10-CAP-11 | 双轨并存 | 语义层 + 迁移完成 |
| T10-ENG-02 | 未决策 | 移除 + 死代码删 |
| T10-ENG-03 | 双轨 Generator | 单路径 |
| T10-ENG-06 | 类型仍在 | 迁移 + 文档 |
| T10-QA-03 | 仅校验函数 | auth-service 覆盖 |
| T10-QA-06 | 未归档 | 性能文档 |

---

## 六、架构决策（ADR）

### ADR-001：Legacy 布局 — **移除**（v10 默认）

| 项 | 决定 |
|----|------|
| 决策 | 删除 `LegacyAppLayout`、`GenerateMode`、`EditMode`、画布内 `GeneratorPanel` |
| 保留 | `isLegacyLayoutForced()` 仅用于迁移期 `localStorage` 提示，或整段删除 |
| 理由 | `GenerateMode`/`EditMode` 已无引用；工作台已覆盖生成/剪辑；减双轨维护 |
| 关联 | **主线一** RED-01~05；T10-ENG-02、T10-ENG-03、T10-QA-02、T10-UI-14 |
| 验收 | 主路径 `App.tsx` 仅 `EditorShell`；`npm test` + e2e 绿 |

---

## 七、明确不在 v10 范围（不进入 §三 总表）

| 项 | 说明 |
|----|------|
| 云端服务端 / 数据云同步 | 独立产品轨道 |
| 导演台 3D / 移动端 / 协作 | 未规划 |
| 分镜 PDF 导出恢复 | v9 Wave 5 已废弃（RED-09）；用例 TC-M-SB-006 已标废弃 |
| 新供应商人声分离**商业接入** | 若超出现有 IPC 骨架，单独立项（T10-EXE-02 仅接配置+adapter） |

---

## 八、文件与模块索引（v10 触点）

```
docs/
  LocalCanvas_v10_项目优化与技术债归集.md   # 本文（双主线）
  v10-qa-run.md                             # T10-QA-05 跑表（待建）
  v10-layout-1280.md                        # T10-UI-10（待建）
  v10-perf-100nodes.md                      # T10-QA-06（待建）
  account-guide.md                          # T10-EXE-05（待建）

# —— 主线一：冗余清除 ——
src/layouts/LegacyAppLayout.tsx             # RED-01 删除目标
src/layouts/modes/GenerateMode.tsx          # RED-02 删除目标
src/layouts/modes/EditMode.tsx              # RED-02 删除目标
src/components/panels/GeneratorPanel.tsx    # RED-03 删除目标
src/App.tsx                                 # 收敛为 EditorShell only

# —— 主线二：技术债 ——
src/layouts/EditorShell.tsx                 # T10-UI-05
src/components/panels/SettingsPanel.tsx     # T10-UI-02 / EXE-03/04
src/components/panels/TextEditorPanel.tsx   # T10-CAP-04
src/components/shell/TopBar.tsx             # T10-UI-06/08
src/components/shell/Dock.tsx               # T10-CAP-02 / UI-07
src/hooks/useDagRun.ts                      # T10-EXE-01
scripts/report-bundle-size.mjs              # RED-10 / T10-ENG-07

e2e/
  workbench-smoke.spec.ts                   # ✅
  legacy-smoke.spec.ts                      # T10-QA-02 → N/A（Legacy 移除后）
```

---

## 九、验收检查表（收官用）

| ID | 检查项 | 通过标准 | 状态 |
|----|--------|----------|------|
| V10-R0 | 冗余清除 | §二 RED 清单全 ✅；`rg` Legacy 主路径 0 | ⬜ |
| V10-R1 | 债务归零 | §三 50 项全 ✅ | ⬜ |
| V10-R2 | P1 100% | 无 P1 ⬜/🔶 | ⬜ |
| V10-R3 | CI | test + build + e2e | ⬜ |
| V10-R4 | v5 跑表 | P1 ≥80% 有 `v10-qa-run.md` | ⬜ |
| V10-R5 | Legacy | ADR-001 落地 | ⬜ |
| V10-R6 | 可维护 | §2.4 五文件拆分或说明 | ⬜ |

---

## 附录 A：v9 → v10 编号对照

| v9 | v10 | v10 状态 |
|----|-----|----------|
| V8-2 | T10-UI-01 | ⬜ |
| V8-3 | T10-UI-02 | 🔶 |
| V8-4 | T10-UI-03 | ✅ v9 |
| V8-6 | T10-UI-04 | 🔶 |
| V8-7 | T10-UI-05 | ⬜ |
| V8-8 | T10-UI-06 | ⬜ |
| V6-3 | T10-CAP-01 | ⬜ |
| V6-5 | T10-CAP-02 | 🔶 |
| V6-6~8 | T10-CAP-03~05 | ⬜ |
| V6-9/10 | T10-CAP-06/07 | ✅ v9 |
| V6-11/12 | T10-CAP-08~10 | ⬜ |
| V5-3 | T10-EXE-01 | ⬜ |
| V5-9~12 | T10-EXE-02~05 | ⬜ |
| V5-11 | T10-UI-14 | 🔶 |
| v9 R2/R8 | T10-ENG-01 / QA-01 | ✅ v9 |

---

## 附录 B：结语

> v9 让 LocalCanvas **轻、快、顺眼**；v10 让它 **无冗余、债清、可维护**。

v10 **两大主线**：**先冗余代码清除（单路径 EditorShell）**，**再技术债归零（§三 43 项 + v5 跑表）**。收官标准：**§二 RED 全 ✅ + §三 无 ⬜/🔶**。

---

*本文档为 v10 唯一待办源；进度更新 §5.1 冗余勾选、§5.2 债务勾选与 §九 验收状态。*
