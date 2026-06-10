# LocalCanvas Agent 功能设计（v11）

> **文档性质**：功能设计 · 非实现手册  
> **版本锚点**：[v11 Agent 与设置增强](./LocalCanvas_v11_Agent与设置增强.md)  
> **参照来源**：ComfyUI-Copilot · comfyui-workflow-skill · n8n AI Workflow Builder · Dify HITL · LangGraph · [KupkaProd Cinema Pipeline](https://github.com/Matticusnicholas/KupkaProd-Cinema-Pipeline) · Cursor 上下文模型  
> **复杂片型专章**：[LocalCanvas_Agent-复杂片型生产模型.md](./LocalCanvas_Agent-复杂片型生产模型.md)  
> **演进对照**：[LocalCanvas_Agent-演进对照.md](./LocalCanvas_Agent-演进对照.md)（能力—代码表 · ShotSpec 契约 · Handoff · Preferences）
> **设计立场**：**Copilot，不是 Autopilot** — Agent 加速画布编排与执行，画布仍是唯一真相源

---

## 一、设计命题

### 1.1 LocalCanvas 的特殊性

LocalCanvas 不是聊天产品，也不是通用 Agent 平台。它是 **本地 AI 视频创作工具**：

- 核心资产：**节点图 + 能力目录 + DAG 执行引擎**
- 核心产出：**可运行的画布状态**，不是对话记录
- 核心约束：**API Key 本地、模型能力有硬边界**（尾帧、Vision、参考图等）

因此 Agent 的设计目标不是「更聪明」，而是 **更少步骤、更少选错、更少返工**。

### 1.2 我们要学什么、不学什么

| 参照项目 | 可借鉴 | LocalCanvas 不照搬 |
|----------|--------|-------------------|
| [ComfyUI-Copilot](https://github.com/AIDC-AI/ComfyUI-Copilot) | 工作流 **召回 + 用户采纳**（采纳率 ~86%）；缺依赖时给安装/配置指引 | 多 Agent 编排、云端节点仓库检索 |
| [comfyui-workflow-skill](https://github.com/twwch/comfyui-workflow-skill) | **模板库 + 节点 Schema 注册表** 注入 LLM；按需加载分类避免上下文膨胀 | 34 模板全量维护；Claude Code Skill 形态 |
| [n8n AI Workflow Builder](https://github.com/n8n-io/n8n) | **Plan / Build 双模式**；**Focused Nodes**（选中节点作上下文）；画布 **增量更新** 而非整图重建；流式反馈 | LangGraph 六 Agent 监督链；企业版 MCP 全家桶 |
| [Dify Human Input](https://docs.dify.ai/en/use-dify/nodes/human-input) | **HITL 是工作流原生能力**，非「全自动 vs 全手动」二元；支持预填 + 修改 + 分支动作（通过/重做） | 邮件投递、Celery 暂停恢复基础设施 |
| [LangGraph](https://github.com/langchain-ai/langgraph) | **Plan → Execute 分离**；有状态、可恢复；仅在必要时 Replan | 长时运行 Agent、子 Agent 树 |
| Cursor | **显式上下文**（@文件/@选区）优于全库灌入；项目 Rules 模块化 | IDE 级代码索引 |
| [KupkaProd](https://github.com/Matticusnicholas/KupkaProd-Cinema-Pipeline) | **七阶段管线**；剧本→分镜关键帧→逐镜多 Take→审片→装配；Storyboard/Take 双 Review | 独立 ComfyUI 脚本栈；LocalCanvas 用画布+分镜组+合成等价实现 |

### 1.3 成功标准

1. **单镜头**：意图 → 可执行画布 ≤ 3 次确认（选方案 → 预览 → 落盘）
2. **品牌片/短片（≥15s、多镜头）**：Brief 确认 → 镜头表预览 → skeleton 落盘 ≤ 5 次确认；**禁止**一条 auto DAG 跑完全片
3. 熟手：Build 模式对选定镜头「改 flf / 加 take」能 **增量改图**
4. 配置闭环：Settings Agent Tab 判断片型所需能力（尾帧 / Vision / 参考图）并跳转补缺
5. 质量：v5 Agent 类 P1 用例 ≥ 80%（回归底线）；复杂片型场景见专章验收

---

## 二、设计理念

### 2.1 五条原则

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. 画布即真相   一切 Agent 操作最终体现为节点/连线的可审查变更      │
│ 2. Copilot 优先 建议、预览、可撤销；默认不静默改写用户已有工作      │
│ 3. 上下文收窄   用「选中节点 + 能力目录」作上下文，不全图灌 LLM    │
│ 4. 模板先行     高频路径走模板召回；LLM 负责补全与变体，非从零造图  │
│ 5. 检查点嵌入   预览确认是检查点；脚本/分镜等长链路内置人工检查点    │
│ 6. 片型分轨     单镜头走短链路；品牌片/短片走 ProductionPlan 多阶段    │
└──────────────────────────────────────────────────────────────────┘
```

**复杂度分轨**（详见 [复杂片型专章](./LocalCanvas_Agent-复杂片型生产模型.md)）：

| 轨道 | 判定 | Agent 主产物 | 默认执行 |
|------|------|--------------|----------|
| **Lite** | 时长 <15s 且单镜头 | `WorkflowPlan`（3–5 节点） | 可 `auto` |
| **Studio** | ≥15s / 多镜头 / 品牌·叙事·蒙太奇 | `ProductionPlan`（Brief + Shot List + skeleton） | `checkpoint` |

### 2.2 双模式：Plan 与 Build

借鉴 n8n 的 Build / Plan 分离，LocalCanvas Agent 区分两种用户意图：

| 模式 | 典型输入 | Agent 行为 | 输出形态 |
|------|----------|------------|----------|
| **Plan**（规划） | 「30 秒咖啡品牌广告，竖屏，多镜头」 | 片型分类 → Brief → 模板召回 → Shot List → 预览 | `ProductionPlan` 或 `WorkflowPlan` |
| **Build**（构建） | 「给这个图像节点后面接视频」「把这里改成首尾帧」 | 读取 Focused Nodes 上下文 → 生成 **图补丁** `GraphPatch` | 增量增删改节点/边 |

**默认推断**：无选中节点 → Plan；有选中节点 → Build。用户可显式切换或输入「重新规划」回到 Plan。

这比 v5 单一的「整句 → 全图计划」更贴合工具应用里 **80% 是改现有图、20% 是从零搭** 的真实比例。

### 2.3 与「通用 Agent」的分界

| 做 | 不做 |
|----|------|
| 工作流模板召回与变体生成 | 多轮闲聊、角色扮演 |
| 选中节点上下文（Focused Nodes） | 全画布自主漫游编辑 |
| 计划/补丁预览 + 确认 | 无确认自动执行全项目 |
| DAG 触发与断点续跑 | 云端 Agent、多用户协作 |
| 缺模型/缺能力的配置指引 | Skill 商店、远程拉取 |

---

## 三、架构概览

### 3.1 处理管道（取代 v5 固定三层）

```
用户输入 + 可选 Focused Nodes
        │
        ▼
┌─────────────────┐
│ 意图路由         │  Plan vs Build
└────────┬────────┘
         ▼
┌─────────────────┐
│ 片型 / 复杂度    │  Lite（单镜头） vs Studio（品牌片/短片）
└────────┬────────┘
         │
    Plan │                              Build
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────┐
│ 模板召回         │              │ 图上下文组装     │
│ Template Recall │              │ 选中节点+邻接边   │
│ Top 1–3 候选     │              │ + 能力目录摘要   │
└────────┬────────┘              └────────┬────────┘
         │ 用户选模板 / 跳过               │
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────┐
│ Studio?          │              │ LLM 图补丁器     │
│ Brief→ShotList   │              │ GraphPatch JSON  │
│ 或 Lite 变体生成  │              │                  │
└────────┬────────┘              └────────┬────────┘
         │                                  │
         └──────────────┬───────────────────┘
                        ▼
               ┌─────────────────┐
               │ 能力选模 enrich  │
               │ 校验 + warnings  │
               └────────┬────────┘
                        ▼
               ┌─────────────────┐
               │ 预览检查点       │  ← Dify 式 HITL：可改摘要/关键参数
               │ 确认 / 重做 / 取消│
               └────────┬────────┘
                        ▼
               ┌─────────────────┐
               │ 落画布           │  Plan: 子图插入  Build: patch 应用
               └────────┬────────┘
                        ▼
               executionMode=auto ? ──► DAG（可在脚本/分镜节点前 pause）
```

### 3.2 核心产物类型

**WorkflowPlan**（Plan 模式，沿用现有类型，扩展语义）：

```typescript
// 现有 src/types/agent.ts 基础上，语义扩展
interface WorkflowPlan {
  version: 1
  intent: string
  summary: string
  nodes: PlannedNode[]
  edges: PlannedEdge[]
  executionMode: 'auto' | 'manual' | 'checkpoint'  // checkpoint: DAG 在标记节点前暂停
  estimatedSteps: number
  skillId?: string
  templateId?: string      // 新增：来自哪条模板
  hitlActions?: ('confirm' | 'regenerate' | 'edit_params')[]  // 预览可用动作
}
```

**GraphPatch**（Build 模式，v11 设计新增，v11.1+ 实现）：

```typescript
interface GraphPatch {
  version: 1
  intent: string
  summary: string
  anchorNodeIds: string[]   // Focused Nodes
  addNodes?: PlannedNode[]
  addEdges?: PlannedEdge[]
  removeNodeIds?: string[]
  removeEdgeIds?: string[]
  updateNodes?: Array<{ tempId: string; data: Record<string, unknown> }>
  executionMode?: 'none' | 'auto' | 'checkpoint'
}
```

落盘策略借鉴 n8n **update-in-place**：Build 模式尽量保留节点 ID 与已有 `data`，只应用补丁，避免「重生成整图导致用户手调参数丢失」。

**ProductionPlan**（Studio 轨道，复杂片主产物）：

包装 `WorkflowPlan`，并携带 `ProductionBrief`、`ShotSpec[]`、阶段轴与 `expansion`（skeleton / per-shot / full）。字段与片型模板见 [复杂片型专章 §四–§五](./LocalCanvas_Agent-复杂片型生产模型.md)。

**升舱规则**：采用 [演进对照 §七](./LocalCanvas_Agent-演进对照.md#七片型分类与升舱规则修订) 打分制（非单一 15s 阈值）；`track=studio` 时 **不得**仅输出三节点 `text-to-video` auto 计划。

### 3.3 模板注册表（统一 Skill + 工作流模板 + 片型模板）

借鉴 comfyui-workflow-skill 的 **模板 + 节点 Schema**，将现有：

- `electron/utility/services/agent/skills/*`
- `docs/v4/workflow-templates.md` 四类预置模板

合并为 **`WorkflowTemplateRegistry`**（本地 TS，无远程拉取）：

| 字段 | 用途 |
|------|------|
| `id` / `name` / `tags` | 召回与展示 |
| `triggers[]` | 关键词 + 语义标签（供轻量召回） |
| `buildPlan(context)` | 参数化生成 |
| `nodeSchemaRef` | 指向节点端口/能力约束摘要（按需注入 LLM） |
| `defaultExecutionMode` | auto / manual / checkpoint |
| `requiredCapabilities[]` | 召回时预检，缺则降权或标注不可用 |

**召回逻辑**（ComfyUI-Copilot 思路简化版）：

1. 关键词 + 标签打分 → Top 3
2. 过滤：用户禁用项、缺硬能力（如尾帧）的模板
3. UI 展示候选卡片：**采纳 / 看详情 / 让 LLM 自由规划**

这比 v5「命中一个 Skill 就直接出计划」更尊重用户选择，也降低误触发成本。

**片型模板**（Studio，注册表扩展）：

| ID | 片型 | 默认 expansion |
|----|------|----------------|
| `brand-spot-30s` | 品牌广告 15–60s | skeleton |
| `narrative-short` | 叙事短片 1–5min | skeleton |
| `product-demo` | 产品功能片 | skeleton |
| `montage-broll` | 旁白 + B-roll 蒙太奇 | skeleton |
| `text-to-video` | 单镜头 Lite | full（≤5 节点） |
| `first-last-frame` | 过渡镜 | full |
| `script-to-film` | 脚本→分镜→合成（升级对齐 narrative） | skeleton |

### 3.4 上下文模型（Cursor / n8n Focused Nodes）

**Focused Nodes**：画布选中或 Agent 输入 `@节点名` 确认的节点集合。

组装 payload（借鉴 n8n `buildFocusedNodesPayload`）：

```xml
<focused_context>
  <node id="img-1" type="image" label="咖啡主图"
        model="seedream-4.5" issues="none" />
  <adjacency>
    img-1 --prompt--> (outbound none)
    txt-1 --prompt--> img-1.prompt
  </adjacency>
  <capability_catalog version="..." />  <!-- 裁剪版，仅相关 kind -->
</focused_context>
```

**指代消解**（n8n deictic-resolution 简化）：「这个」「它」→ 优先 Focused Nodes → 其次上次计划提及节点 → 最后全图 fallback（Build 模式禁用全图 fallback，避免误伤）。

### 3.5 能力选模（保持现有 enrich，提升可解释性）

`enrichWorkflowPlanWithModels` / patch 中新增节点均走同一选模器。

**增强点**（ComfyUI-Copilot「缺依赖指引」）：

- 警告分级：`blocking`（无法执行）/ `degraded`（回退模型）/ `info`
- blocking 时预览 Primary 动作变为「去配置」跳转 Settings，而非仅 ⚠ 文案

---

## 四、人机协作（HITL）

### 4.1 三级检查点

借鉴 Dify，把 HITL 从「确认前点一次」扩展为 **嵌入执行图的原生暂停**：

| 级别 | 时机 | 用户动作 | 实现成本 |
|------|------|----------|----------|
| L1 计划预览 | 落画布前 | 确认 / 重做 / 取消 | ✅ 已有 WorkflowPlanPreview |
| L2 参数微调 | 预览层 | 改 `summary` 中的关键参数（时长、画幅、风格 tag） | v11 P1 可选 |
| L3 执行检查点 | DAG 运行中 | 在 `script` / `storyboard` 节点前自动 `paused` | v11.1+ |

`executionMode: 'checkpoint'` 表示：DAG 自动跑到检查点节点前停止，用户审阅产出后点「继续」或 `/run`。

**设计理由**：脚本成片类链路，ComfyUI-Copilot 与 Dify 社区反馈都指向同一结论——**全自动跑完长链路浪费算力且质量不可控**；应在「分镜生成后」「批量出图前」给人看一眼。

### 4.2 预览动作集

| 动作 | 行为 |
|------|------|
| **确认并添加** | 落画布；按 executionMode 决定是否 DAG |
| **换一个方案** | Plan 模式重新召回或 LLM 重规划（保留会话上下文） |
| **只落盘不执行** | 强制 `executionMode=manual` 一次 |
| **取消** | 不清画布 |

---

## 五、交互与入口

### 5.1 AgentCompanion（浮岛 / 钉住）

> UI 线框与组件规格见 [Agent UI 设计 §三](./LocalCanvas_Agent-UI设计.md#三agent-对话窗-ui)。

保持 v8/v9 双形态。v11 增强：

| 项 | 说明 |
|----|------|
| 模式指示 | 输入框旁 `Plan | Build` 自动/手动切换 |
| Focused 芯片 | 选中节点显示为芯片（n8n `FocusedNodeChip`）；发送后清空 |
| 模板候选卡片 | Plan 模式召回 Top 3 时，消息区展示可点选卡片 |
| 流式状态 | 借鉴 n8n：「召回模板…」「选模中…」「生成计划…」阶段提示（非 token 流） |

### 5.2 入口矩阵

| 入口 | 默认模式 | 上下文 |
|------|----------|--------|
| `/agent` | Plan | 无 |
| 画布选中 ≥1 节点后打开 Agent | Build | Focused Nodes |
| 右键「交给 Agent 扩展」 | Build | 右键节点 |
| 工作流模板侧边栏「用 Agent 调整」 | Build | 模板实例节点 |

### 5.3 典型场景

> 复杂片型分镜、检查点、Shot 模式见 [复杂片型专章 §七](./LocalCanvas_Agent-复杂片型生产模型.md)。

#### Lite 轨道（单镜头）

**场景 A — 5 秒产品空镜**：`single-shot` → `文生图生视频` → 3 节点预览 → DAG auto

**场景 B — Build 增量**：选中图像 →「后接 5 秒视频，首帧用这张图」→ `GraphPatch` → `/run` 子图

#### Studio 轨道（品牌片 / 短片 — 主路径）

**场景 C — 30 秒咖啡品牌广告（多 Beat）**

1. Brief：30s / 9:16 / HOOK·HERO·STORY·CTA → 用户确认
2. 6 镜 Shot List + skeleton（script / storyboard / compose / audio）
3. DAG 仅跑脚本分镜 → checkpoint → 分镜组批量图/视频 → 剪辑台导出

**场景 D — 2 分钟叙事短片**：`narrative-short`，18 镜分场景；每场景末 checkpoint；Build 改单镜

**场景 E — 45 秒 SaaS 产品片**：Focused 参考图 + `product-demo`，HERO 镜 `ref-sheet`

**场景 F — 90 秒纪录片蒙太奇**：`montage-broll`，旁白拆条 + 多 B-roll `t2v` → 长合成轨

**场景 G — Take 选优**（v12）：`takesPerShot: 2` → 分镜重生选 Take → compose 用选用版

---

## 六、Settings Agent Tab（v11 P0）

> UI 线框与组件规格见 [Agent UI 设计 §二](./LocalCanvas_Agent-UI设计.md#二agent-设置页-ui)。

### 6.1 信息架构

```
设置
├── 已接入模型
├── 默认模型
├── 🤖 Agent          ← v11 新增
├── 媒体与路径
├── 界面
└── 快捷键
```

### 6.2 配置项

| 配置项 | 存储 | 说明 |
|--------|------|------|
| Agent 规划 LLM | 复用 `settings.default_llm` | 只读 + 跳转「默认模型」 |
| Agent 偏好（统一） | `lc-agent-preferences` | 见 [演进对照 §六](./LocalCanvas_Agent-演进对照.md#六agentpreferences-统一配置)；迁移旧 `lc-agent-*` 键 |
| 能力预检摘要 | 运行时计算 | 按片型展示：尾帧 / Vision / 参考图 / TTS |
| 引导 | i18n | 链到 agent-guide + 复杂片型专章 |

**仍不放**：独立 API Key、温度、System Prompt 编辑器 — 与「工具统一配模型」一致。

---

## 七、数据与接口

### 7.1 IPC 演进

| 方法 | v11 | 说明 |
|------|-----|------|
| `agent:chat` | ✅ 扩展 | 增 `mode`、`focusedNodeIds`、`selectedTemplateId`；响应可含 `productionPlan` |
| `agent:listTemplates` | 🆕 P1 | 模板注册表（含片型模板元数据） |
| `agent:applyPatch` | 🆕 v11.1 | Build 模式补丁预览后落盘 |
| `agent:expandShots` | 🆕 v12 | 将 Shot List 展开为 per-shot 子图（受镜数上限约束） |
| `agent:listSessions` / `getSession` | ✅ | 保持 |

### 7.2 进程分工（不变）

- **Utility**：规划、召回、LLM、选模
- **Main**：会话持久化
- **Renderer**：预览、确认、Focused UI、DAG 触发

---

## 八、v11 交付切片

按 **价值 / 成本** 切三刀，避免一口吃成 n8n：

### Slice A — v11.0（P0，可发布）

> 能力 ID 与 **不在 v11.0** 清单见 [演进对照 §1.2](./LocalCanvas_Agent-演进对照.md#12-v110-范围收紧与详案对齐)。

| 项 | 说明 |
|----|------|
| Settings Agent Tab + AgentPreferences | §六 + [演进对照 §六](./LocalCanvas_Agent-演进对照.md#六agentpreferences-统一配置) |
| 模板注册表内部统一 | Skill 与 workflow-templates 同构 |
| 模板召回 UI | Top 1–3 卡片 + 采纳（替代静默 Skill 命中） |
| 能力预检与跳转 | blocking → `openSettings({ tab, focus })` |
| 片型标签（可选 P1） | 只读展示 Lite/Studio，**无 Brief/Shot 落盘** |
| Agent P1 跑表 | ≥ 80% |
| 文档 | agent-guide 更新 |

### Slice B — v11.1（P1）

| 项 | 说明 |
|----|------|
| Focused Nodes | 选中节点芯片 + Build 模式路由 |
| `GraphPatch` | 增量改图 + 预览 |
| checkpoint 最小 | Studio 确认后 **不** `startRun`；见 [演进对照 §四](./LocalCanvas_Agent-演进对照.md#四checkpoint-续跑协议v111-实现规格) |
| Studio Handoff | CP2+ 导航条，见 [演进对照 §五](./LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航) |
| 预览「换一个方案」 | 同会话重规划 |

### Slice C — v11.2（P2，体验）

| 项 | 说明 |
|----|------|
| 流式阶段提示 | 非 token 流的状态机 UI |
| L2 参数微调 | Brief 卡改时长/画幅/风格 |
| AgentCompanion 审计 | 层级、未读、错误文案统一 |

### Slice D — v12（Studio 复杂片）

> **版本规划**：[v12/LocalCanvas_v12_Studio复杂片与Agent深化.md](./LocalCanvas_v12_Studio复杂片与Agent深化.md) · Wave 1–3 与 DoD 以该文档为准。

| 项 | 说明 |
|----|------|
| `ProductionPlan` + Brief HITL | 片型分类、镜头表、阶段轴 |
| 片型模板 `brand-spot` / `narrative-short` 等 | skeleton 落盘 |
| `creativeBible` | 角色/产品一致性 prompt 前缀 |
| 多 Take + 分镜选优 | 对标 KupkaProd Reviewer |
| `agent:expandShots` | 有限 per-shot 展开（≤6 镜） |

### 明确不做（v11 全版本）

- 多 Agent 监督链（n8n 式 Supervisor/Discovery/Builder 六件套）
- MCP 工具服务器 / 外部网页浏览
- 视觉评分自动重试（Comfy-Cozy 式 autorepair）
- Skill 商店、云端模板同步
- 全画布自主编辑（无 Focused 约束的 Build）

---

## 九、验收标准

### 9.1 功能

- [ ] Lite：单镜头仍可走 3 节点 auto
- [ ] Studio：≥15s 品牌片强制 ProductionPlan，不出现单链路 auto 跑全片
- [ ] Brief 未确认前不生成 Shot List、不落盘
- [ ] Plan：召回 ≥2 候选时用户可不选任何模板而走 LLM
- [ ] Build（v11.1）：选中单节点增量加视频，不重绘全图
- [ ] checkpoint（v11.1）：脚本链路在分镜后暂停，可继续 DAG
- [ ] 缺尾帧模型：blocking 警告 + Settings 跳转
- [ ] Settings 模板开关即时生效

### 9.2 非功能

| 项 | 目标 |
|----|------|
| 模板召回 | P95 < 200ms |
| Focused payload 组装 | P95 < 50ms |
| LLM 规划 | 依赖模型；禁止重复提交 |
| 包体 | 不引入 LangGraph 等重型依赖；编排用现有 TS |

---

## 十、演进备忘（v12+ 信号触发）

| 候选 | 触发信号 |
|------|----------|
| 语义模板召回（embedding） | 关键词误召回率 > 30% |
| 计划局部 diff 编辑器 | 「换一个方案」仍无法满足，用户反复整句重说 |
| 与项目 Rules 同步 | 团队统一风格/品牌约束需版本化 |
| 视觉验收环节 | 用户对 auto 链路质量投诉集中 |

---

## 十一、总结

LocalCanvas Agent 的 v11 设计，从 v5「关键词 Skill → LLM → 回退」升级为业界已验证的 **Copilot 工作流模式**：

1. **模板召回 + 用户采纳**（ComfyUI-Copilot）
2. **Plan / Build 双模式 + Focused Nodes**（n8n）
3. **检查点式 HITL**（Dify）
4. **Plan-Execute 分离、按需 Replan**（LangGraph）
5. **显式窄上下文**（Cursor）

但一切收敛于 LocalCanvas 的工具属性：**画布是真相、本地可信、增量可审、DAG 同构执行**。

**复杂度策略**：单镜头走 Lite 短链路；品牌片与电影短片走 Studio **七阶段 + 多检查点**（对标 KupkaProd），用现有 script / storyboard / compose 承载，而非另起一套「全自动电影工厂」。v11 交付配置与召回；v12 交付 ProductionPlan 与片型模板。

---

## 附录：参照链接

| 项目 | 链接 | 借鉴点 |
|------|------|--------|
| ComfyUI-Copilot | https://github.com/AIDC-AI/ComfyUI-Copilot | 工作流推荐与采纳 |
| comfyui-workflow-skill | https://github.com/twwch/comfyui-workflow-skill | 模板 + 节点 Schema |
| n8n Focused Nodes | https://github.com/n8n-io/n8n/pull/25452 | @节点上下文 |
| n8n AI Workflow Builder | https://github.com/n8n-io/n8n/pull/17423 | 流式画布同步、增量更新 |
| Dify Human Input | https://docs.dify.ai/en/use-dify/nodes/human-input | 原生 HITL 检查点 |
| LangGraph | https://github.com/langchain-ai/langgraph | Plan-and-Execute |
| KupkaProd | https://github.com/Matticusnicholas/KupkaProd-Cinema-Pipeline | 多阶段审片、多 Take |

## 相关文档

- [演进对照](./LocalCanvas_Agent-演进对照.md)
- [复杂片型生产模型](./LocalCanvas_Agent-复杂片型生产模型.md)
- [Agent UI 设计](./LocalCanvas_Agent-UI设计.md) — 设置页 Agent Tab · 对话窗/浮岛/预览卡 · 联动深链接
- [v11 版本规划](./LocalCanvas_v11_Agent与设置增强.md)
- [Agent 使用指南](../v5/agent-guide.md)
- [工作流模板](../v4/workflow-templates.md)
- [模型能力系统](../v6/design/LocalCanvas_模型能力系统重设计.md)
