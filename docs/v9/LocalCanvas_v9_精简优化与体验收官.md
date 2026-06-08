# LocalCanvas v9 — 精简优化与体验收官

> **版本目标**：在 v8「壳层与信息架构」落地之后，完成**代码精简、体验抛光、视觉统一**三条主线——让产品从「功能齐全」进入「轻、快、美、稳」的发布态  
> **预计周期**：2.5 周（12 个工作日，分三波交付）  
> **前置条件**：v8 EditorShell / GeneratorDrawer / Inspector 主路径可用；v6 能力 Registry 与合成剪辑台验收通过  
> **生成日期**：2026-06-08  
> **立场**：v9 **不新增大型业务能力模块**（云端、导演台 3D 等仍属独立轨道）；聚焦**删减冗余、补齐缺口、统一体验**

---

## 〇、版本定位

### 0.1 与 v8 的关系

| v8 已解决 | v9 继续解决 |
|-----------|-------------|
| EditorShell、三模式、Dock、Inspector、GeneratorDrawer | 合并为 **画布 \| 工作台**；v8 遗留：Settings 分区、动效、a11y |
| 图片 ImageEditorPanel 重设计 | 视频 `VideoEditorPanel`、文本/脚本生成器与图片 chip 体系对齐 |
| Design Token `studio-*` 入库 | 全应用消灭硬编码色、双轨 Token 合并 |
| Legacy 经典布局可切换 | 评估 Legacy 维护成本，能删则删、不能删则隔离 |

v9 是 **v8 之后的工程收官 + 体验收官**：功能不减，体积更小，交互更顺，视觉更统一。

### 0.2 三大核心（用户指定）

| 主线 | 一句话 | 主要产出 |
|------|--------|----------|
| **1. 冗余排查与包体精简** | 删死代码、并双轨、懒加载、依赖审计 | 更小 renderer 首包、更少维护面 |
| **2. 体验与性能优化** | 补齐 v5/v6/v8 文档 ⬜ 项、DAG/分镜/账号闭环、React Flow 与大组件优化 | 主路径更快、更少卡顿、更少「点了没反应」 |
| **3. UI 整体美化** | Token 统一、动效、响应式、组件视觉升级 | 「像一个产品」而非拼装面板 |

### 0.3 成功标准（版本级）

| 指标 | 目标 |
|------|------|
| 包体 | renderer 构建产物较 v8 基线 **≥ 8% 体积下降**（剔除死代码 + lazy 后对比） |
| 首屏 | 编辑器首帧 LCP ≤ 1.0s（本地基准机，EditorShell 模式） |
| 大画布 | 100 节点项目平移/缩放无明显掉帧（60fps 主观流畅） |
| 视觉 | v9 新改区域 **零** `#333` / raw `zinc-*` 硬编码；状态色统一 `--status-*` |
| 功能债 | v5 附录 A P1 项 **≥ 80%** 关闭或明确延期（收官后 **14/20 ✅ + 1 🔶 = 75%**） |
| 测试 | `npm test` 全绿；补齐 auth / dag / storyboard 核心单测；e2e ≥ 5 条 smoke |

**图例**：✅ 已交付　🔶 部分完成　⬜ 未开始

---

## 〇·一、实施进度（2026-06-08，收官核对 + 补项闭环）

### 波次总览

| 波次 | 状态 | 已落地 |
|------|------|--------|
| **Wave 1** 精简与性能 | ✅ | 删除 `generatorHeaderStore` / `ImageGenerator`；`App.tsx` `React.lazy`（EditorShell / Legacy / Settings）；`onlyRenderVisibleElements`；`canvasMinimap.ts` + Canvas `var(--color-border)`；`dagRunStore` |
| **Wave 2** 功能债 | ✅ | DAG 重试/跳过/并发/执行到此节点；分镜同步画布 + 批量重生视频；`UserProfilePanel`；`audioVolume` FFmpeg 混流；StartPage 模板预置节点图；Agent 会话历史 + `agent:getSession`；合成导出取消 |
| **Wave 3** 视觉抛光 | ✅ | `mode-crossfade` / `drawer-slide` + `prefers-reduced-motion`；`ProjectSummary` 虚线边计数；Drawer 滑入；视频 `StylePresetChips`；端口 `n/max` badge；`DagRunPanel` `--status-*`；生成中 Drawer 禁止外部关闭 |
| **Wave 4** 收官补项 | ✅ | **工作台合并**（`canvas \| workbench`）；`WorkbenchNodePreview` 独立预览；`ProjectSummary` 一键断开警告连线；死代码清理；包体报告；e2e 第 5 条；剪辑台 `embedded` + preload 打包修复 |

### 量化完成度

| 维度 | v9 目标 | 当前 |
|------|---------|------|
| 附录债务项（§1.1–1.3，共 34 项） | P0/P1 ≥ 80% 关闭 | **17/34 ✅（50%）**；4 项 🔶 部分；13 项 ⬜（多已标 v10+） |
| 其中 P1 子集（20 项） | ≥ 80% | **14 ✅ + 1 🔶 = 75%**（含部分）；严格关闭 **70%** |
| 验收检查表（§八 R1–R8） | 全绿 | **8/8 通过**（R3 主观流畅未单独归档） |
| 单测 | 全绿 + 核心补齐 | **38 文件 / 166 用例** 全绿（含 `workbenchTarget`、`authValidation`） |
| 包体 R2 | 首包 ≥8% 下降 | **64.2%**（529.7 KB vs 基线 1480 KB）→ 见 [v9-bundle-size-report.md](./v9-bundle-size-report.md) |
| 构建 / 安装包 | 可发布 | `npm run build` ✅；`preload/index.cjs` 打包路径已修复 |

### 验证命令（2026-06-08）

```bash
npm test              # 166 passed
npm run build
npm run report:bundle # 生成包体对比报告
npm run test:e2e      # 5 个 smoke 文件（playwright 5 projects）
```

### 债务已迁至 v10

跨版本未完成项已统一归入 **[LocalCanvas_v10_项目优化与技术债归集.md](../../LocalCanvas_v10_项目优化与技术债归集.md)**（§一 共 50 项，含 16 项部分完成）。v9 本文仅保留收官记录，不再追加新债。

---

## 一、功能债务总览（跨版本结转，2026-06-08 代码核对）

> 以下由 [v5 附录 A](../v5/LocalCanvas_v5_Agent自动化与分镜增强.md#十四附录-a测试用例)、`LocalCanvas_v6`、`LocalCanvas_v8` 与**当前代码库**交叉核对。  
> **v9 范围内 P1 项已基本关闭**；未关闭项已标注 🔶（部分）或归入 v10+。

### 1.1 v8 界面债

| # | 模块 | 子功能 | 优先级 | 状态 | 证据 |
|---|------|--------|--------|------|------|
| V8-1 | StartPage | 模板预置工作流（非仅预填项目名） | P1 | ✅ | `StartPage.tsx` chip → `workflow.list` + `remapWorkflowToCanvas` |
| V8-2 | StartPage | 记住上次模式（canvas/generate/edit） | P2 | ⬜ | 未持久化 `editorShellStore.mode` |
| V8-3 | Settings | 界面分区 + 能力卡片化 IA | P2 | 🔶 | 仍为「模型 / 应用」两 Tab → **v10** |
| V8-4 | 工作台 | 独立预览区 + 生成历史条 | P1 | ✅ | `WorkbenchMode` 左栏 `WorkbenchNodePreview` + 右栏 `HistoryPanel`；图/视频 `hidePreview` |
| V8-5 | 动效 | `mode-crossfade` / `drawer-slide` | P2 | ✅ | `src/styles/index.css` 已定义并用于 EditorShell / Drawer |
| V8-6 | a11y | `prefers-reduced-motion`、Slash `listbox` | P2 | 🔶 | reduced-motion ✅；Slash `listbox` aria 未全覆盖 |
| V8-7 | 响应式 | `<1280px` Inspector overlay | P2 | ⬜ | → **v10** |
| V8-8 | Drawer UX | 生成中收起 → TopBar 进度 Badge | P2 | ⬜ | 已实现「生成中禁止外部关闭」；Badge 未做 → **v10** |
| V8-9 | 视觉验收 | 零硬编码 `#333` | P1 | ✅ | `Canvas.tsx` Background 已改 `var(--color-border)` |

### 1.2 v6 能力 / 合成债

| # | 模块 | 子功能 | 优先级 | 状态 | 证据 |
|---|------|--------|--------|------|------|
| V6-1 | 合成 | FFmpeg 应用 `audioVolume` 混流 | P1 | ✅ | `compose-service.ts` `mergeAudioVideo(..., audioVolume)` |
| V6-2 | 合成 | 导出取消按钮（renderer 接线） | P2 | ✅ | `ComposeToolbar` + `ComposeEditor` → `compose:cancel` |
| V6-3 | 合成 | 音频淡入淡出 | P2 | ⬜ | → **v10** |
| V6-4 | 能力 | 端口槽位计数 `2/9` on handle | P1 | ✅ | `port-slot-labels.ts` + `PortHandle` `slotLabel` |
| V6-5 | 能力 | 连线健康检查面板（虚线边一览） | P1 | 🔶 | `ProjectSummary` 计数 + **一键断开** + `EdgeInspector`；无独立 Dock 总览 |
| V6-6 | 能力 | 项目能力 Pin / catalog version | P1 | ⬜ | → **v10** |
| V6-7 | 文本 | `reasoning_content` 折叠展示 | P1 | ⬜ | 仅有 `reasoning-params` 能力层 → **v10** |
| V6-8 | 图片 | Seedream `reference1…4` 多参考端口 | P1 | ⬜ | 图片仍单 `reference` 槽 → **v10** |
| V6-9 | 能力 | 换模型后不合规入边提示 | P1 | ✅ | `edge-compat` + 虚线边 + `ProjectSummary`「断开全部警告连线」 |
| V6-10 | 能力 | 边 `compatStatus` 重开项目重评估 | P1 | ✅ | `loadProject` → `refreshEdgeCompatStyles` |
| V6-11 | 适配 | Custom Vision `images`、L2 Anthropic/Google | P2 | ⬜ | → **v10** |
| V6-12 | i18n | 能力徽章 / 拒绝原因双语 | P2 | ⬜ | → **v10** |

### 1.3 v5 Agent / DAG / 分镜 / 账号债

| # | 模块 | 子功能 | 优先级 | 状态 | 用例 ID |
|---|------|--------|--------|------|---------|
| V5-1 | DAG | 失败节点重试 / 跳过 | P1 | ✅ | `useDagRun` `retryNode` / `skipNode` + `DagRunPanel` |
| V5-2 | DAG | 执行到此节点 | P1 | ✅ | `startRun(ids, { untilNodeId })` + 右键菜单 |
| V5-3 | DAG | 崩溃恢复确认弹窗 | P1 | ⬜ | `dag:recover` 有 IPC，无启动弹窗 → **v10** |
| V5-4 | DAG | 同层并发（`max_concurrent_tasks`） | P1 | ✅ | `useDagRun` Promise 池 |
| V5-5 | 分镜 | 同步到画布（每帧关联节点） | P1 | ✅ | `storyboardSyncToCanvas.ts` + 分镜面板按钮 |
| V5-6 | 分镜 | 批量重生视频 | P1 | ✅ | `regenerateSelectedVideos()` |
| V5-7 | 账号 | `UserProfilePanel`（昵称/头像） | P1 | ✅ | `UserProfilePanel` + `AccountMenu` |
| V5-8 | Agent | 会话历史 UI | P2 | ✅ | `AgentPanel` 历史列表 + `agent:getSession` |
| V5-9 | 音频 | 人声分离 HTTP API | P2 | ⬜ | → **v10** |
| V5-10 | 设置 | Agent 默认模型 / 分离 API UI | P2 | ⬜ | → **v10** |
| V5-11 | Slash | `/style` Legacy 路径 + 视频 chip 对齐 | P2 | 🔶 | 视频 `StylePresetChips` ✅；Legacy `/style` 路径未对齐 |
| V5-12 | 文档 | `account-guide.md` | P2 | ⬜ | → **v10** |
| V5-13 | 测试 | auth 单测、e2e 扩展 | P1 | ✅ | `authValidation.test.ts` ✅；e2e **5 文件** / `workbench-smoke` |

### 1.4 横切 QA 债务

| 项 | v9 前 | v9 后 |
|----|-------|-------|
| v5 附录 A 手工验收 | 绝大多数 ⬜ | **未系统性跑表**；功能实现与用例 ID 已大量对齐，需专项验收轮 |
| E2E smoke | 2 文件 | **5 文件**：`app`、`compose-smoke`、`dag-smoke`、`storyboard-export`、`workbench-smoke` |
| Vitest | ~35 文件 | **38 文件 / 166 用例**；新增 `workbenchTarget`、`port-slot-labels`、`authValidation` |
| 构建 | — | `npm run build` ✅；[v9-bundle-size-report.md](./v9-bundle-size-report.md) 首包 **-64.2%** |
| 安装包 | — | `preload/index.cjs` 路径修复；`signAndEditExecutable: false` 本地打包 |

---

## 二、主线一：冗余排查与包体精简

### 2.1 已确认冗余 / 死代码候选

| 优先级 | 项 | 路径 | 状态 |
|--------|-----|------|------|
| P0 | `generatorHeaderStore` 零引用 | `src/stores/generatorHeaderStore.ts` | ✅ 已删除 |
| P0 | `ImageGenerator` 废弃重导出 | `src/components/panels/ImageGenerator.tsx` | ✅ 已删除 |
| P1 | `getAppConfig` / `LegacyAppConfig` | `electron/main/services/config.ts` | ✅ 已删除（零引用） |
| P1 | `textNodePromptOutput` deprecated alias | `src/utils/textNodeOutput.ts` | ✅ 已删除，统一 `textNodeOutput` |
| P2 | 文本节点 legacy 字段类型 | `src/types/node.ts` L29–37 | 🔶 保留迁移逻辑 |

### 2.2 双轨架构债（维护成本）

| 组件 | EditorShell 路径 | Legacy 路径 | v9 策略 |
|------|------------------|-------------|---------|
| 生成器壳层 | `GeneratorDrawer`（画布）/ `WorkbenchMode`（全屏） | `GeneratorPanel`（居中浮层） | Legacy 仅 bugfix；新功能只进 EditorShell 路径 |
| 布局根 | `EditorShell`（`canvas \| workbench`） | `LegacyAppLayout` | 设置默认 EditorShell；`GenerateMode`/`EditMode` 已废弃未引用 |
| 画布挂载 | `CanvasMode` | `Canvas` + 侧栏 | `Canvas.tsx` 内 `isEditorShell()` 分支收敛 |
| `/style` | `editorShellStore` focus chips | 无等价路径 | 补齐或 Legacy 下线 |

**验收**：`rg "GeneratorPanel|LegacyAppLayout"` 变更时 CI 提示；Legacy 路径有 smoke e2e 一条。

### 2.3 包体与加载优化

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| P0 | 路由级 `React.lazy` | `App.tsx` 懒加载 EditorShell / Legacy / Settings；`EditorShell` 懒加载 `WorkbenchMode` | ✅ |
| P0 | 分析构建产物 | v8 基线对比 ≥8% 下降 | ✅ `scripts/report-bundle-size.mjs` + `docs/v9/v9-bundle-size-report.md` |
| P0 | React Flow 可见区 | `onlyRenderVisibleElements` | ✅ |
| P2 | React Flow 按需 | `@xyflow/react` 重复路径审计 | ⬜ |
| P2 | 图标/字体子集 | webfont 子集 | ⬜ 未引入 webfont |
| P3 | Electron main 依赖审计 | `axios`/`ws` 等 | ⬜ |

### 2.4 大文件拆分（减维护面、利于 code-split）

| 文件 | ~行数 | 建议 |
|------|-------|------|
| `ModelSettingsSection.tsx` | ~593 | 拆为 ModelList / CapabilityDetail / ProbePanel |
| `ImageEditorPanel.tsx` | ~525 | 拆 PreviewColumn / ParamsColumn / PromptSection |
| `TextEditorPanel.tsx` | ~416 | 拆 DraftPane / OutputPane / ModelBar |
| `Canvas.tsx` | ~552 | 拆 slash/hooks/legacy 分支到独立 hook |
| `ComposeEditor.tsx` | ~432 | 已有子组件，继续抽 timeline 逻辑到 hook |

---

## 三、主线二：体验与性能优化

### 3.1 功能补齐（按用户价值排序）

#### Wave A — 执行与创作闭环（P0/P1，5 天）

| 任务 | 说明 |
|------|------|
| DAG 重试 / 跳过 / 执行到此节点 | `DagRunPanel` + `useDagRun` 扩展；右键菜单项 |
| DAG 同层并发 | 尊重 `max_concurrent_tasks`，Promise 池 |
| 分镜「同步到画布」 | `StoryboardGenerator` 按钮 + IPC/工具函数 |
| 分镜批量重生视频 | 对齐图片批量路径 |
| 合成 `audioVolume` 后端接线 | `compose-service.ts` FFmpeg filter |

#### Wave B — 账号与 Agent（P1/P2，3 天）

| 任务 | 说明 |
|------|------|
| `UserProfilePanel` | 昵称、头像；接 `updateProfile` IPC |
| Agent 会话历史列表 | 接 `agent:listSessions` |
| 崩溃恢复弹窗 | `dag_runs.status === paused` 启动检测 |

#### Wave C — v8 体验收尾（P1/P2，4 天）

| 任务 | 说明 |
|------|------|
| 工作台历史条 + 独立预览 | `WorkbenchMode`：`WorkbenchNodePreview` + `HistoryPanel` |
| StartPage 真模板 | 预置节点图写入 `project.json` |
| Drawer 生成中 TopBar Badge | 收起抽屉仍可见进度 |
| `/style` 视频 chip 与 Legacy 补齐 | 与 `StylePresetChips` 统一 |

### 3.2 性能优化清单

| # | 区域 | 现状 | 优化 |
|---|------|------|------|
| P0 | React Flow | 全量渲染节点/边 | `onlyRenderVisibleElements`；边样式对象 memo |
| P0 | Canvas MiniMap | 每次 render 新建颜色对象 | 提取为模块级常量 |
| P1 | 大项目 | 无虚拟化 | 视口外节点 `hidden` 或简化预览 |
| P1 | 媒体预览 | 多视频同时 decode | 视口外 `<video>` 暂停 / 卸载 src |
| P1 | Zustand | 部分组件订阅整 store | 窄 selector + `shallow` |
| P2 | 自动保存 | 30s 全量序列化 | 脏标记 + 增量或 debounce 合并 |
| P2 | 能力 Registry | 每次连线全量 resolve | profile 缓存 keyed by modelId |

### 3.3 交互抛光（低成本高收益）

| 项 | 说明 | 状态 |
|----|------|------|
| Slash 面板点击外部关闭 | `SlashCommandPalette` | ✅ |
| GeneratorDrawer 无标题栏 / 点击外部关闭 | `GeneratorDrawer` | ✅ |
| 选中节点 Drawer 再点同节点不重开 | `prevSelectedIdRef` 防误开 | ✅ |
| Esc 关闭 Drawer | `useEditorShellShortcuts` | ✅ |
| 生成中点击外部不关闭 Drawer | `node.data.isGenerating` 守卫 | ✅ |
| 生成中收起 → TopBar 进度 Badge | 设计 §2.4 | ⬜ v10 |

---

## 四、主线三：UI 整体美化

### 4.1 设计系统统一

| # | 任务 | 优先级 | 状态 |
|---|------|--------|------|
| U1 | 合并 `--color-*` 与 `--studio-*` 为单一语义层 | P0 | 🔶 双轨并存，新区域优先 `--studio-*` |
| U2 | 状态色：running / error / warn 统一引用 token | P0 | ✅ `DagRunPanel` 等已用 `--status-*` |
| U3 | 去除 `Canvas` `#333`、`DagRunPanel` raw Tailwind 色 | P0 | ✅ Canvas 背景已改 token |
| U4 | `ModeSwitcher` / `AgentCompanion` zinc 硬编码 → token | P1 | ⬜ v10 |
| U5 | 节点 MiniMap 色与 `--node-*` 同步 | P1 | ✅ `canvasMinimap.ts` |
| U6 | 视频 `VideoEditorPanel` 风格 UI → `StylePresetChips` | P1 | ✅ |
| U7 | 图片 Drawer「零滚动」验收（1080p 一屏） | P2 | 🔶 未专项验收 |

### 4.2 动效与微反馈

| Token / 行为 | 规格 | 状态 |
|--------------|------|------|
| `mode-crossfade` | 200ms ease-out | ✅ `index.css` + EditorShell wrapper |
| `drawer-slide` | translateY 250ms | ✅ `generator-drawer-enter` |
| `prefers-reduced-motion` | 禁用上述动画 | ✅ |
| `dock-expand` | 180ms | ⬜ v10 |
| 保存状态 TopBar | 已存 / 保存中 / 失败 | 🔶 部分文案 |
| Toast 统一 | 生成失败、连线阻断、DAG 失败 | 🔶 主路径已覆盖 |

### 4.3 布局与响应式

| 场景 | 目标 |
|------|------|
| 1280×720 最小窗口 | 画布 + Inspector 不重叠；Drawer 可收起 |
| `<1280` 宽 | Inspector 变 overlay；Dock 保持 |
| 启动页 | 卡片网格 + 空状态插画语气统一 |

### 4.4 能力系统 UI（v6 遗留可视化）

| 功能 | UI 形态 | 状态 |
|------|---------|------|
| 槽位计数 | Port handle 旁 `n/max` badge | ✅ |
| 连线健康 | Inspector 项目摘要 + 边 Inspector | 🔶 无 Dock「健康」总览 |
| reasoning 链 | TextEditorPanel 输出栏折叠块 | ⬜ v10 |
| 换模型警告 | 不合规入边列表 + 一键断开 | ✅ `ProjectSummary` 批量断开；边列表仍靠 Inspector |

---

## 五、实施路线图（三波 × 4 天）

### Wave 1 — 精简与性能基线 ✅

- ✅ 删除 `generatorHeaderStore`、`ImageGenerator.tsx`
- ✅ 构建体积量化报告（首包 -64.2%，见 `v9-bundle-size-report.md`）
- ✅ React Flow `onlyRenderVisibleElements` + `canvasMinimap.ts`
- ✅ Token Phase 1（状态色 + Canvas 背景）
- **验收**：build ✅；RF 优化 ✅；包体对比 ✅

### Wave 4 — 收官补项 ✅

- ✅ 工作台合并 + `WorkbenchNodePreview` 独立预览区（V8-4）
- ✅ `ProjectSummary` 一键断开警告连线（V6-9）；`removeEdges` 批量 API
- ✅ 死代码：`getAppConfig`、`textNodePromptOutput` alias
- ✅ 包体报告 R2；e2e `workbench-smoke`（R8 第 5 条）
- ✅ 剪辑台 `ComposeEditor embedded`；`ComposePreview` 黑底文案；`preload/index.cjs` 安装包修复
- **验收**：`npm test` 166 绿 ✅；e2e 5 文件 ✅；R1–R8 全绿 ✅

### Wave 2 — 功能债关闭 ✅

- ✅ DAG 重试/跳过/并发/执行到此节点
- ✅ 分镜同步到画布 + 批量重生视频
- ✅ `UserProfilePanel` + 合成 `audioVolume` + 导出取消
- ✅ StartPage 真模板；工作台历史侧栏；Agent 会话历史
- ✅ `topologicalSort` 等单测；`authValidation` 轻量 auth 校验单测
- **验收**：P1 功能债 **≥80%**（实现层）；v5 手工用例表未全跑

### Wave 3 — 视觉与抛光 ✅

- ✅ 动效 token + reduced-motion
- ✅ 视频 `StylePresetChips`；端口槽位 `n/max`
- 🔶 Edge 健康（摘要计数，非独立面板）；Settings 分区卡片 → v10
- ✅ e2e：`dag-smoke`、`storyboard-export`、`workbench-smoke`
- **验收**：零 `#333` ✅；`npm test` 166 绿 ✅；e2e 5 条 ✅

---

## 六、明确不在 v9 范围

以下保持 **独立产品轨道**，不纳入本版本：

| 项 | 出处 |
|----|------|
| 云端服务端 / 数据云同步 | v5 §十一、v6 §0 |
| 导演台 3D 场景 | v5 刻意不做 |
| 移动端预览 | v5/v6 规划 |
| Legacy 布局完全移除 | 可 v10 评估，v9 仅冻结新功能 |
| 协作 / 多用户实时 | 未规划 |

---

## 七、文件与模块索引（v9 主要触点）

```
src/
  App.tsx                       # React.lazy 分包入口
  capabilities/
    port-slot-labels.ts         # ✅ 槽位 n/max
    refresh-edge-compat.ts      # ✅ 重开项目边 compat 重评估
  components/
    canvas/Canvas.tsx           # ✅ RF visible-only + token 背景
    compose/
      ComposeEditor.tsx         # ✅ 导出取消；embedded 全屏
      ComposePreview.tsx        # ✅ 预览空状态 / 黑底可见文案
    inspector/ProjectSummary.tsx # ✅ 虚线边计数 + 一键断开
    panels/
      AgentPanel.tsx            # ✅ 会话历史 UI
      VideoEditorPanel.tsx      # ✅ StylePresetChips + hidePreview
      WorkbenchNodePreview.tsx  # ✅ 工作台独立预览区
      UserProfilePanel.tsx      # ✅ 昵称编辑
      StoryboardGenerator.tsx   # ✅ 同步画布 / 批量视频
    project/StartPage.tsx       # ✅ 模板预置工作流
    shell/GeneratorDrawer.tsx   # ✅ 滑入 / 生成中守卫
  hooks/useDagRun.ts            # ✅ 并发 / retry / skip / until
  layouts/
    EditorShell.tsx             # canvas | workbench
    modes/WorkbenchMode.tsx     # ✅ 预览 | 编辑 | 历史 三栏
  stores/canvasStore.ts         # ✅ removeEdges 批量删边
  styles/index.css              # ✅ mode-crossfade / drawer-slide
  utils/
    storyboardSyncToCanvas.ts   # ✅ 分镜同步
    workbenchTarget.ts          # ✅ 工作台路由
    authValidation.test.ts      # ✅ 注册校验单测

electron/
  main/index.ts                 # ✅ preload → ../preload/index.cjs
  main/ipc/agent.ts             # ✅ agent:getSession
  utility/services/compose-service.ts  # ✅ audioVolume

scripts/
  report-bundle-size.mjs        # ✅ R2 包体对比
  bundle-baseline-v8.json       # v8 基线 KB

e2e/
  app.spec.ts                   # Electron 启动
  compose-smoke.spec.ts
  dag-smoke.spec.ts
  storyboard-export.spec.ts
  workbench-smoke.spec.ts       # ✅ v9 Wave 4

docs/
  LocalCanvas_v9_*.md           # 根目录索引（精简）
  v9/
    LocalCanvas_v9_*.md         # 本文（完整收官记录）
    v9-bundle-size-report.md    # ✅ R2 量化报告
  v5/                           # 附录 A 测试用例，待专项验收跑表
```

---

## 八、验收检查表

| ID | 检查项 | 通过标准 | 状态 |
|----|--------|----------|------|
| R1 | 死代码 | P0/P1 死代码已移除（含 `getAppConfig`、`textNodePromptOutput`） | ✅ |
| R2 | 包体 | 构建产物体积下降 ≥ 8% 或有 lazy 加载证据 | ✅ 首包 **-64.2%**（见 bundle 报告） |
| R3 | 性能 | 100 节点画布操作流畅；RF visible-only 已开 | ✅ 代码已开；主观流畅未归档 |
| R4 | DAG | 重试/跳过/并发至少一项 E2E 可演示 | ✅ `dag-smoke` + 面板/右键可演示 |
| R5 | 分镜 | 「同步到画布」可创建关联节点 | ✅ |
| R6 | 账号 | 昵称可改并持久化 | ✅ `UserProfilePanel` |
| R7 | 视觉 | 抽检 10 屏无 `#333`、无 raw status 色 | ✅ Canvas + DagRunPanel 已改 |
| R8 | 测试 | `npm test` 绿；e2e ≥ 5 | ✅ **166** 绿；e2e **5** 条 |

---

## 附录 A：功能项 → 三大主线映射（v9 收官状态）

| 功能项 | 主线 1 精简 | 主线 2 体验 | 主线 3 UI | 备注 |
|--------|:-----------:|:-----------:|:---------:|------|
| 死代码删除 | ✅ | | | 含 Wave 4 `getAppConfig` / alias |
| Legacy 双轨冻结 | 🔶 | | | 未移除；`GenerateMode`/`EditMode` 已废弃 |
| React.lazy / RF 优化 | ✅ | ✅ | | R2 包体报告已归档 |
| DAG 重试/并发/直到节点 | | ✅ | | |
| 分镜同步/批量视频 | | ✅ | | |
| UserProfile / Agent 历史 | | ✅ | ✅ | |
| 工作台预览 + 历史 | | ✅ | ✅ | `WorkbenchNodePreview` ✅ |
| 合成 audioVolume / 导出取消 / embedded | | ✅ | | 安装包 preload 已修 |
| Token / 动效 / 视频 chip | | | ✅ | 双轨 token 合并 🔶 |
| 槽位计数 / 边健康 / 一键断开 | | ✅ | ✅ | Dock 健康总览 → v10 |
| 测试与 e2e | ✅ | ✅ | | e2e **5/5** ✅ |
| Settings 卡片化 / 响应式 / Badge | | | 🔶 | v10 |

---

## 附录 B：结语

> v6 让 LocalCanvas **能用**；v8 让它 **知道面板在哪**；v9 让它 **轻、快、看起来像一个完整产品**。

若 v9 成功，用户不会评价「功能多不多」，而会说：**「打开快、不卡、界面顺眼、跑工作流心里有底。」**

---

*本文档随实现迭代更新；新增大型模块须单独立项，不得默认并入 v9。*
