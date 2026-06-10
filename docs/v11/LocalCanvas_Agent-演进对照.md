# LocalCanvas Agent — 演进对照（v11 设计补遗）

> **文档性质**：实现对照 · 数据契约 · 导航补遗  
> **回应**：[功能设计评价](./LocalCanvas_Agent功能设计.md) 中「能力—版本—代码对齐」「ShotSpec 落盘」「Agent 退场导航」三项缺口  
> **父文档**：[LocalCanvas_Agent功能设计.md](./LocalCanvas_Agent功能设计.md) · [复杂片型生产模型](./LocalCanvas_Agent-复杂片型生产模型.md) · [Agent UI 设计](./LocalCanvas_Agent-UI设计.md)

---

## 一、能力 — 版本 — 代码对照表

**图例**：✅ 已有　🔶 部分　⬜ 设计态　— 不做

| 能力 ID | 说明 | 代码现状 | v11.0 A | v11.1 B | v11.2 C | v12 D |
|---------|------|----------|---------|---------|---------|-------|
| **A01** | Agent 对话 + 会话持久化 | ✅ `AgentPanel` · `agent-session-repository` | 保持 | 保持 | 保持 | +`productionPlan` 字段 |
| **A02** | Skill 静默命中 | ✅ `matchSkill` in `agent-service.ts` | 🔶 改为模板卡片召回 | — | — | — |
| **A03** | LLM 工作流规划 | ✅ `workflow-planner.ts` + `parseWorkflowPlan` | 保持 | 保持 | +片型 few-shot | +ShotSpec schema |
| **A04** | 能力选模 enrich | ✅ `agent-plan-enrich.ts` | +blocking 分级 UI | 保持 | 保持 | per-shot 选模 |
| **A05** | 计划落画布 | ✅ `applyWorkflowPlan.ts` | 保持 | 保持 | 保持 | +`applyProductionPlan` |
| **A06** | auto DAG 执行 | ✅ `useDagRun` · `executionMode: auto` | 保持 | 保持 | 保持 | Studio 禁用全片 auto |
| **A07** | manual 计划 | ✅ `executionMode: manual` | 保持 | 保持 | 保持 | 保持 |
| **A08** | checkpoint 执行 | ⬜ 类型无 `checkpoint`；DAG 无 `stopAt` | ⬜ 仅文档+设置开关 | ✅ 见 §四 | 保持 | 保持 |
| **A09** | Settings Agent Tab | ⬜ 无 `SettingsAgentTab` | ✅ 新建 | 保持 | +Tab 警告点 | +片型能力矩阵 |
| **A10** | 模板召回 UI | ⬜ 无 `AgentTemplateCards` | ✅ | 保持 | 保持 | +片型模板卡 |
| **A11** | Plan / Build 模式 | ⬜ 无模式切换 | 🔶 仅 UI 切换 | ✅ Build 路由 | 保持 | 保持 |
| **A12** | GraphPatch 增量改图 | ⬜ 无类型/应用器 | ⬜ | ✅ `GraphPatch` + preview | 保持 | 保持 |
| **A13** | Focused Nodes | ⬜ 无芯片/@mention | ⬜ | ✅ 画布选中同步 | +@下拉 | 保持 |
| **A14** | 深链接 Settings | ⬜ `setSettingsOpen` 无 tab/focus | ✅ `openSettings({tab,focus})` | 保持 | 保持 | 保持 |
| **A15** | AgentCompanion 协同 | 🔶 浮岛/钉住已有；Drawer 未自动收起 | 🔶 Drawer 收起 | 保持 | 审计 | 保持 |
| **A16** | 片型分类 Lite/Studio | ⬜ | 🔶 规则预判+标签展示 | 保持 | 保持 | ✅ LLM+规则 |
| **A17** | ProductionBrief 卡 | ⬜ | ⬜ 只读草案（可选） | ⬜ | 🔶 可编辑字段 | ✅ HITL 确认 |
| **A18** | Shot List 预览 | ⬜ | ⬜ | ⬜ | 🔶 折叠表 | ✅ 完整+校验 |
| **A19** | ProductionPlan 落盘 | ⬜ | ⬜ | 🔶 skeleton only | 保持 | ✅ `buildProductionPlan` |
| **A20** | ShotSpec→script 契约 | ⬜ | ⬜ | ⬜ 文档§二 | 保持 | ✅ 实现+单测 |
| **A21** | script→storyboard | ✅ `scriptRowsToFrames` · 右键转分镜组 | 人工触发 | 保持 | 保持 | Agent 引导 |
| **A22** | Studio Handoff 导航 | ⬜ | ⬜ | ✅ 见 §五 | 保持 | 保持 |
| **A23** | creativeBible | ⬜ | — | — | — | ✅ `project.metadata` |
| **A24** | 多 Take 选优 | 🔶 历史+分镜重生 | — | — | — | ✅ 选用版→compose |
| **A25** | `agent:expandShots` | ⬜ | — | — | — | ✅ ≤6 镜 |
| **A26** | AgentPreferences 统一 | ⬜ 分散 localStorage | ✅ 见 §六 | 保持 | 保持 | 保持 |

### 1.1 关键代码路径（修正 v11 规划）

| 模块 | 正确路径 |
|------|----------|
| Agent 推理 | `electron/utility/services/agent/agent-service.ts` |
| Skill / 模板 | `electron/utility/services/agent/skills/*` |
| Agent IPC | `electron/main/ipc/agent.ts` |
| 会话库 | `electron/main/repositories/agent-session-repository.ts` |
| DAG 调度（渲染器） | `src/hooks/useDagRun.ts` |
| DAG 持久化 | `electron/main/repositories/dag-run-repository.ts`（含 `paused` 状态） |
| 计划类型 | `src/types/agent.ts` |
| 计划解析 | `src/utils/parseWorkflowPlan.ts`（**仅** `auto \| manual`） |
| 壳层 / 设置门 | `src/stores/editorShellStore.ts`（`settingsOpen`） |

### 1.2 v11.0 范围收紧（与详案对齐）

**v11.0 必交付（P0）**：A01–A07 回归、A09–A10、A14、A26、A02 召回改造、A04 blocking UI。

**v11.0 可选（P1，不挡发布）**：A11 模式切换 UI（不启用 Build 路由）、A16 片型标签只读。

**明确不在 v11.0**：A17 Brief 确认流、A18–A20 Shot 落盘、A08 checkpoint 运行时、A12 GraphPatch。

---

## 二、统一阶段枚举

三套表述合并为 **一层检查点 CP + 一层制作阶段 ST**，避免 Phase 0–7 与 UI Rail 不一致。

### 2.1 检查点（CP）— 用户可感知门禁

| CP ID | 名称 | 对应制作活动 | Agent 参与 | 默认 UI |
|-------|------|--------------|------------|---------|
| **CP0** | 简报 | Brief 确认 | ✅ 对话窗 Brief 卡 | Agent 浮岛/钉住 |
| **CP1** | 镜头表 | Shot List 确认 | ✅ 对话窗 Shot List | Agent |
| **CP2** | 脚本 | 脚本节点分镜表定稿 | 🔶 引导，不自动改 | 脚本面板 + Handoff 条 |
| **CP3** | 分镜图 | 关键帧/宫格审阅 | ❌ | 分镜组 + `/grid` |
| **CP4** | 镜头成片 | 逐镜视频 / Take 选优 | 🔶 Build 改单镜 | 分镜组 + 历史 |
| **CP5** | 装配 | 合成时间线 | ❌ | 剪辑台 workbench |
| **CP6** | 导出 | 编码导出 | ❌ | 合成导出抽屉 |

### 2.2 制作阶段（ST）— 逻辑管线（对齐复杂片专章）

| ST ID | 名称 | 映射 CP | 画布节点 |
|-------|------|---------|----------|
| ST-Brief | 简报与圣经 | CP0 | （会话内 JSON，v12 入 project） |
| ST-Script | 节拍与镜头表 | CP1–CP2 | `script` |
| ST-Board | 分镜图 | CP3 | `storyboard` |
| ST-Shoot | 镜头生产 | CP4 | 帧关联 image/video 或 per-shot 子图 |
| ST-Assemble | 装配 | CP5 | `compose` + `audio` |
| ST-Deliver | 交付 | CP6 | compose 导出 |

### 2.3 UI Phase Rail（对话窗 5 段）

Rail 只展示 **用户需要在 Agent 会话内关心的段**（不过载）：

```
简报 · 镜头表 · 脚本 · 分镜 · 合成
 CP0    CP1      CP2    CP3    CP5
```

CP4（成片审片）、CP6（导出）通过 **Handoff 条** 引导到分镜组/剪辑台，不占 Rail 点位。

---

## 三、ShotSpec 落盘契约

### 3.1 字段映射：ShotSpec → ScriptRow

| ShotSpec | ScriptRow | 规则 |
|----------|-----------|------|
| `sequence` | `sequence` | 1-based，连续无洞 |
| `description` | `description` | 直接拷贝 |
| `prompt` | `prompt` | 直接拷贝；若有 `creativeBible` 前缀在落盘时拼接进 `prompt`，**不**写入 `description` |
| `durationSec` | `duration` | 秒，≥1，见 §3.3 |
| `camera` | `camera` | 直接拷贝 |
| `id` | `id` | `generateId('shot')` 新 UUID，**不**保留 ShotSpec.id 除非 Build 补丁更新 |
| `sceneId` / `beat` | — | 写入 `script` 节点 `data.productionMeta`（v12 扩展字段） |
| `productionMode` | — | 写入 `productionMeta.shots[sequence].mode`，供展开 per-shot 时使用 |
| `dialogue` / `vo` | `description` 后缀 | 格式 `\n[对白] …` / `\n[旁白] …` |

```typescript
// script 节点 data 扩展（v12）
interface ScriptProductionMeta {
  brief?: ProductionBrief
  shots?: Array<{ sequence: number; beat?: string; sceneId?: string; mode?: ShotProductionMode }>
  appliedFrom?: { productionPlanId?: string; templateId?: string; at: string }
}
```

### 3.2 字段映射：ScriptRow → StoryboardFrame

复用现有 `scriptRowsToFrames`（`src/utils/storyboardConvert.ts`）：

| ScriptRow | StoryboardFrame | 规则 |
|-----------|-----------------|------|
| 全字段 | 同名 | 1:1 |
| — | `status` | 初始 `'empty'` |
| `rowAssets[seq]` | `imageNodeId` / `videoNodeId` | 仅当已同步画布或批量生成后填充 |

**Agent skeleton 落盘时**：创建空 `storyboard` 节点（`frames: []`），**不**预填 frames；用户在 CP2 后「脚本→转分镜组」或 Agent Handoff「生成分镜组」时执行 `scriptRowsToFrames`。

### 3.3 时长预算校验

落盘前在 Planner / Preview 层执行：

```typescript
interface DurationBudgetResult {
  ok: boolean
  targetSec: number
  sumSec: number
  deltaSec: number
  level: 'ok' | 'warn' | 'block'
}

// 规则
// |sum - target| <= 2s        → ok
// |sum - target| <= 10%      → warn（预览 ⚠，可确认）
// 否则                       → block（必须「调整镜头表」或改 Brief）
```

单镜：`durationSec` clamp 到 `[1, 30]`（可配置）；`flf` 镜最短 3s。

### 3.4 skeleton 落盘图（Studio 默认）

`applyProductionPlan(plan, offset)` 在 v12 包装 `applyWorkflowPlan`：

| 节点 tempId | type | 初始 data |
|-------------|------|-----------|
| `script-1` | script | `storyInput` ← brief 摘要；`scriptRows` ← ShotSpec 映射；`productionMeta` |
| `storyboard-1` | storyboard | `frames: []`, `layout: 'list'`, `name` ← brief.title |
| `compose-1` | compose | `clips: []`；预置 N 路 video 空 clip 槽（N = min(shotCount, 6)） |
| `audio-1` | audio | 可选占位，`data.label` = BGM |

**边**：脚本成片骨架 **默认无边**；compose 与视频连线在 CP4 后由用户或 Handoff「连接已成片镜头」批量创建。

### 3.5 失败与回滚

| 失败点 | 行为 |
|--------|------|
| 时长 block | 不调用 `applyWorkflowPlan`；会话保留 `pendingProductionPlan` |
| 缺 blocking 模型 | 同现有；Primary「去配置」 |
| 落盘中途错误 | 事务式：先收集 nodes/edges，**一次性** `addNode`；失败则 Toast，不部分落盘 |
| Build patch 冲突 | 锚定节点已删除 → 拒绝 patch，提示重新选中 |

---

## 四、Checkpoint 续跑协议（v11.1 实现规格）

### 4.1 类型扩展

```typescript
// src/types/agent.ts
executionMode: 'auto' | 'manual' | 'checkpoint'

interface WorkflowPlan {
  // ...
  checkpointAfter?: Array<'script' | 'storyboard'>  // 节点 type，非 id
}
```

`parseWorkflowPlan`：识别 `checkpoint` 与 `checkpointAfter`；未知则降级 `manual`。

### 4.2 DAG 行为

```
startRun(nodeIds, { stopAfterTypes?: NodeType[] })
```

1. 拓扑序执行可生成节点（text/image/video）
2. 某节点 **完成后**，若其 `type` ∈ `stopAfterTypes` → `dagRun.status = 'paused'`，**不**继续调度
3. `script` / `storyboard` 节点本身不执行生成，但若在拓扑中作为「边界」：
   - **策略**：checkpoint 在「脚本 LLM 生成分镜完成」事件触发（`script` 节点 data 更新后），由 `AgentPanel` 或脚本面板回调 `dag:updateRun({ status: 'paused' })`，而非 DAG 内隐式识别 script 类型

**v11.1 最小实现（推荐）**：

- Studio / `script-to-film` 计划：`executionMode: 'checkpoint'`，`checkpointAfter: ['script']`
- Agent 确认落盘 **不** 调用 `startRun`；用户于脚本面板点击「生成分镜」完成后，弹出 **Handoff 条**（§五），DAG 不自动继续
- 仅 Lite `auto` 计划保持「确认即 startRun」

### 4.3 续跑

| 用户动作 | 系统行为 |
|----------|----------|
| Handoff「继续：打开分镜组」 | 选中 storyboard 节点，切 workbench/inspector，DAG 保持 paused |
| `/run` 选中子图 | 新 `dag:createRun`，不恢复旧 run |
| DAG 面板「继续」（v11.2） | 将 paused run 标为 running，从下一 pending 节点执行 |

---

## 五、Studio Handoff — Agent 退场导航

Agent 在 CP0–CP1 主场；**CP2 起** 通过 **Handoff 条** 把用户送到已有专业 UI，避免「计划落盘即失联」。

### 5.1 Handoff 条组件

**位置**：`AgentPanel` 消息流底部固定条（非浮岛外）；或画布顶栏 `EditorShell` 下 slim banner（`agentHandoff` store）。

```
┌─ 下一步 · 脚本已定稿 ────────────────────────────────────────┐
│ ① 打开脚本面板，检查分镜表  [前往脚本]                        │
│ ② 转为分镜组并出图          [打开分镜组]                      │
│ ③ 批量生成视频              [选中子图后 /run]                 │
│ ④ 进入剪辑台                [打开合成]                        │
│                                    [收起] [在 Agent 中继续]   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 触发条件

| 阶段 | 触发 | 默认展开步骤 |
|------|------|--------------|
| 计划落盘（Studio skeleton） | `applyProductionPlan` 成功 | ① |
| 脚本生成分镜完成 | 脚本节点 `scriptRows.length > 0` 且用户曾用 Agent Studio | ② |
| 分镜组已有 ≥1 帧图片 | storyboard `frames` 含 image | ③ |
| ≥2 视频片段就绪 | compose 入边 ≥2 或分镜帧 status=video | ④ |

存储：`project.metadata.agentHandoff` 或 `agentStore.handoffStep`（会话级）。

### 5.3 动作实现

| 按钮 | 调用 |
|------|------|
| 前往脚本 | `setSelection([scriptNodeId])` + `toggleDrawer('nodes')` + Inspector 滚到脚本区 |
| 打开分镜组 | 若无 storyboard：调现有「脚本→转分镜组」；`setSelection([sbId])` + `setMode('workbench')` |
| 打开合成 | `openWorkbenchForCompose(composeNodeId)` |
| 在 Agent 中继续 | `setAgentExpanded(true)`；Build 模式；Focused=当前选中 |

### 5.4 画布高亮

Handoff 目标节点：`pulse` 描边 `ring-2 ring-accent` 3s（复用 v8 微反馈，尊重 `prefers-reduced-motion`）。

### 5.5 Dock 协同

| Dock 项 | Handoff 关联 |
|---------|--------------|
| 节点 | CP2 脚本 |
| 分镜/历史 | CP3–CP4 |
| 合成入口 | CP5（经 workbench） |

不在 Dock 新增「Agent」项——Agent 仍用 FAB/浮岛，避免与 Handoff 重复。

---

## 六、AgentPreferences 统一配置

取代分散的 `lc-agent-*` 键，单对象版本化：

```typescript
interface AgentPreferences {
  version: 1
  disabledTemplateIds: string[]
  defaultMode: 'auto' | 'plan' | 'build'   // auto=按选中推断
  autoRunAfterConfirm: boolean
  checkpointEnabled: boolean
  defaultTrack: 'auto' | 'lite' | 'studio'
  takesPerShot: number  // 1-3，v12 生效
}

const LS_KEY = 'lc-agent-preferences'
```

**迁移**（首次读取）：

- `lc-agent-disabled-skills` → `disabledTemplateIds`
- `lc-agent-disabled-templates` 若存在则优先
- 其它旧键按字段合并后删除（一次性）

Settings Agent Tab 与 `AgentPanel` **只读写此对象**（debounce 400ms 与 Settings 一致）。

---

## 七、片型分类与升舱规则（修订）

避免「15 秒」硬阈值误判：

```
score_studio =
  (mentions_duration && duration_sec > 12 ? 2 : 0)
  + (multi_shot_keywords ? 2 : 0)
  + (brand_narrative_keywords ? 1 : 0)
  + (explicit_storyboard ? 2 : 0)

score_lite =
  (single_shot_keywords ? 2 : 0)
  + (duration_sec && duration_sec <= 12 ? 1 : 0)

track = score_studio >= 3 && score_studio > score_lite ? 'studio' : 'lite'
```

| 条件 | 结果 |
|------|------|
| `track=studio` | 禁止推荐 `text-to-video` auto；推荐片型模板或 ProductionPlan |
| `track=lite` 但用户采纳 `script-to-film` | 允许 manual/checkpoint skeleton |
| 无法解析时长 | 不升舱，展示 Lite+Studio 模板各 1 张 |

用户可在 Brief 卡（v12）或设置 `defaultTrack: 'lite'` 强制不降舱。

---

## 八、测试矩阵扩展

在 v5 附录 A 之外增加 **Studio 冒烟**（v12 起自动化）：

| ID | 场景 | 验收 |
|----|------|------|
| ST-01 | 30s 品牌意图 → studio 轨道 | 不出现 3 节点 auto |
| ST-02 | Shot 总时长超 target 15% | block，不可落盘 |
| ST-03 | skeleton 落盘 | script 含 N 行 scriptRows；storyboard 空 frames |
| ST-04 | 脚本→转分镜组 | frames.length === scriptRows.length |
| ST-05 | Handoff ① | 点击后选中 script 并打开 Dock 节点 |
| ST-06 | Build patch 加 video | 锚定 image 仍在，+1 video 边 |
| ST-07 | checkpoint 计划 | 确认后不自动 startRun |
| ST-08 | preferences 迁移 | 旧 disabled-skills 仍生效 |

v11.0 跑表仍用 v5 P1 ≥80%；ST-* 记入 v12 DoD。

---

## 九、文档与实现顺序建议

```
v11.0: A09 A10 A14 A26 A02 A04 + 规划文档对齐
v11.1: A08(最小) A12 A13 A22 Handoff + checkpoint 不自动跑
v11.2: A17只读 A18折叠 A11完整 + Phase Rail
v12.0: A19 A20 A03ShotSpec + ST-01..08
```

---

## 相关文档

- [**实现进度统计表**](./LocalCanvas_Agent-实现进度统计表.md)（逐项 IMP-* / ST-* 状态，活文档）
- [v12 版本规划](../v12/LocalCanvas_v12_Studio复杂片与Agent深化.md)（Slice D / 能力 A16–A25 的实现与 DoD）
- [v11 版本规划](./LocalCanvas_v11_Agent与设置增强.md)
- [Agent 功能设计](./LocalCanvas_Agent功能设计.md)
- [复杂片型生产模型](./LocalCanvas_Agent-复杂片型生产模型.md)
- [Agent UI 设计](./LocalCanvas_Agent-UI设计.md)
