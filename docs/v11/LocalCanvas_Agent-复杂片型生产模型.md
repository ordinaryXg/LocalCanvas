# LocalCanvas Agent — 复杂片型生产模型

> **文档性质**：功能设计专章 · 品牌片 / 叙事短片 / 多镜头工程  
> **父文档**：[LocalCanvas_Agent功能设计.md](./LocalCanvas_Agent功能设计.md)  
> **落盘契约**：[演进对照 §三](./LocalCanvas_Agent-演进对照.md#三shotspec-落盘契约) · **阶段枚举**：[演进对照 §二](./LocalCanvas_Agent-演进对照.md#二统一阶段枚举) · **Handoff**：[演进对照 §五](./LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航)
> **参照**：[KupkaProd Cinema Pipeline](https://github.com/Matticusnicholas/KupkaProd-Cinema-Pipeline) · [Wan2.1 ComfyUI 多阶段视频管线](https://comfyui-wiki.com/en/tutorial/advanced/video/wan2.1/wan2-1-video-model) · ComfyUI 超分/插帧组合工作流

---

## 一、为什么需要这一章

当前「文生图生视频」三节点链路只适合 **单镜头概念验证**。真实品牌宣传片与电影短片在 Git 开源工程里普遍是 **多阶段、多镜头、多检查点** 的系统：

| 工程特征 | KupkaProd 等实践 | LocalCanvas 现状 |
|----------|------------------|------------------|
| 剧本/节拍拆解 | LLM 解析 INT./EXT.、对白时长 | 脚本节点 ✅ |
| 逐镜关键帧 | 每场景多候选 → 人工批准 | 分镜组 + 宫格 ✅ |
| 镜头生产模式 | T2V / I2V（关键帧驱动）/ 首尾帧 | 端口能力 ✅ |
| 每镜多 Take | 1–10 takes，选优 | 需设计（历史/重生成） |
| 审片门禁 | Storyboard Review + Take Review | checkpoint 设计中 |
| 成片装配 | FFmpeg 无损拼接 + 音轨 | 合成剪辑台 ✅ |
| 后期增强 | 超分、插帧（ComfyUI 分组） | 未内置，可留扩展口 |

**设计目标**：Agent 能 **规划并落盘** 复杂片型的画布结构，把人放在关键审片点，而不是用一条 auto DAG 跑完 90 秒品牌片。

---

## 二、片型 taxonomy（Agent 可识别）

Agent 规划前先做 **片型分类**，决定阶段深度与节点展开策略：

| 片型 ID | 典型时长 | 结构特征 | 默认模板 | executionMode |
|---------|----------|----------|----------|---------------|
| `single-shot` | 3–8s | 单画面 + 单片段 | 文生图生视频 | auto |
| `brand-spot` | 15–60s | Hook → 产品/品牌英雄镜 → 情绪镜 → CTA/落版 | 品牌广告片 | checkpoint |
| `product-demo` | 30–90s | 功能特写 + 使用场景 + 对比/数据 | 产品展示片 | checkpoint |
| `narrative-short` | 1–5min | 多场景叙事、角色弧线、对白/旁白 | 叙事短片 | checkpoint |
| `montage-broll` | 30s–3min | 旁白驱动 + B-roll 蒙太奇（纪录片/自然类） | 纪录片蒙太奇 | checkpoint |
| `flf-transition` | 5–15s | 强过渡/变形镜头 | 首尾帧过渡 | auto |

**推断信号**（Plan 模式 LLM + 规则）：

- 时长词：「15 秒」「30 秒广告」「三分钟短片」
- 结构词：「分镜」「多镜头」「蒙太奇」「第一幕」
- 商业词：「品牌」「产品」「CTA」「slogan 落版」
- 叙事词：「故事」「角色」「对白」「场景」

---

## 三、制作管线（ST 阶段 + CP 检查点）

> **统一命名**见 [演进对照 §二](./LocalCanvas_Agent-演进对照.md#二统一阶段枚举)。下文 ST = 制作阶段，CP = 用户检查点。

借鉴 KupkaProd 与 ComfyUI 分组工作流，在 LocalCanvas 抽象为 **六段制作 + 七道检查点**（Brief/Bible 合并为 ST-Brief，导出独立为 CP6）。

| ST 阶段 | 活动 | CP 门禁 |
|---------|------|---------|
| ST-Brief | 简报 + 创意圣经 | CP0 |
| ST-Script | 节拍表 + 镜头表 + 脚本定稿 | CP1、CP2 |
| ST-Board | 分镜关键帧 | CP3 |
| ST-Shoot | 逐镜视频 / Take | CP4 |
| ST-Assemble | 合成、配乐、字幕 | CP5 |
| ST-Deliver | 导出 | CP6 |

### 3.1 阶段与画布节点映射

| ST / CP | 画布承载 | DAG / 导航 |
|---------|----------|------------|
| ST-Brief / CP0–1 | 会话内 Brief + Shot List（v12） | 不跑 DAG |
| ST-Script / CP2 | `script`（`storyInput` + `scriptRows`） | 脚本生成后 Handoff；v11.1 不自动 `startRun` |
| ST-Board / CP3 | `storyboard`（脚本转分镜组） | 批量出图前人工审；`/grid` |
| ST-Shoot / CP4 | 帧关联 image/video 或 per-shot 子图 | 按镜并行；Take 选优 v12 |
| ST-Assemble / CP5 | `compose` + `audio` + 字幕 | 剪辑台；Handoff 打开合成 |
| ST-Deliver / CP6 | compose 导出 | compose IPC |

**关键原则**：ST-Shoot 不默认「一条 DAG 跑完所有镜头」；CP2 起由 [Handoff](./LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航) 引导至专业 UI。

### 3.2 镜头生产模式（Shot Production Mode）

每个镜头在 `ShotSpec` 上标注模式，Agent 展开子图时选用不同端口拓扑：

| 模式 | 适用 | 节点拓扑 |
|------|------|----------|
| `t2v` | B-roll、抽象空镜、快速铺量 | text → video（prompt） |
| `i2v` | 品牌英雄镜、产品特写（先锁画面） | text → image → video（firstFrame + prompt） |
| `flf` | 转场、变形、时间流逝 | text×2 → image×2 → video（first + last） |
| `ref-sheet` | 角色/产品一致性 | text → image(ref) → image → video |

模式选择规则（Agent 内置 heuristics）：

- 有 **产品/角色锁定** 需求 → 优先 `i2v` 或 `ref-sheet`
- 节拍表标注 **TRANSITION** → `flf`
- 蒙太奇快速切片、时长 <3s → `t2v`
- 缺尾帧模型时 `flf` 降级为 `i2v` 并 warning

---

## 四、核心数据结构

### 4.1 ProductionBrief（P0–P1）

```typescript
interface ProductionBrief {
  title: string
  filmType: 'brand-spot' | 'product-demo' | 'narrative-short' | 'montage-broll' | ...
  targetDurationSec: number
  aspectRatio: '16:9' | '9:16' | '1:1'
  tone: string[]           // 电影感、温暖、科技感
  audience?: string
  mustInclude?: string[]    // 产品名、logo、slogan
  avoid?: string[]
  styleRefs?: string[]      // 映射到风格 chip id
  checkpointPolicy: 'strict' | 'relaxed'  // strict = 每阶段暂停
}
```

用户于 Agent **Brief 卡** 上确认后，才进入 Shot List 生成（Dify HITL 同构）。

### 4.2 ShotSpec（P2 产出）

```typescript
interface ShotSpec {
  id: string
  sequence: number
  sceneId: string          // SC01、SC02…
  beat: string             // HOOK | HERO | CTA | …
  durationSec: number
  camera: string           // 特写、推拉、航拍…
  description: string
  dialogue?: string
  vo?: string
  productionMode: 't2v' | 'i2v' | 'flf' | 'ref-sheet'
  prompt: string
  negativePrompt?: string
  characterIds?: string[]
  references?: string[]      // 参考图句柄，落盘时连 referenceN
}
```

`ScriptRow` 与 `ShotSpec` 字段对齐，便于 script 节点一次性填充。

### 4.3 ProductionPlan（Agent 主产物，包装 WorkflowPlan）

```typescript
interface ProductionPlan {
  version: 1
  brief: ProductionBrief
  shots: ShotSpec[]
  phases: Array<{
    id: string
    name: string
    status: 'pending' | 'active' | 'checkpoint' | 'done'
    nodeTempIds: string[]
  }>
  /** 展开后的可落盘图 */
  workflow: WorkflowPlan
  expansion: 'skeleton' | 'per-shot' | 'full'
  takesPerShot?: number      // 默认 1；品牌片可建议 2–3
}
```

**展开策略** `expansion`：

| 值 | 含义 | 适用 |
|----|------|------|
| `skeleton` | script + storyboard + compose 骨架 | 默认；复杂片首选 |
| `per-shot` | 骨架 + 为前 N 镜生成完整 text→image→video 子图 | 用户要求「先把前 3 镜搭好」 |
| `full` | 所有镜头子图全展开 | 仅 ≤6 镜；否则画布爆炸 |

### 4.4 创意圣经 Character / Product Sheet（P1，可选）

```typescript
interface CreativeBibleEntry {
  id: string
  kind: 'character' | 'product' | 'location'
  name: string
  visualDescription: string
  referenceImageHint?: string
  lockedPromptPrefix?: string   // 拼入每镜 prompt
}
```

存储：`project.metadata.creativeBible` 或首版 localStorage per project。Agent 生成每镜 prompt 时注入，对标 KupkaProd「角色描述一致性校验」。

---

## 五、复杂片型模板（WorkflowTemplateRegistry 扩展）

在现有 3 Skill + 4 工作流模板之上，新增 **片型模板**（非全部 v11.0 实现，但设计预留）：

### 5.1 品牌广告片 `brand-spot-30s`

**结构节拍**（30s 示例）：

| Beat | 时长 | 镜头数 | 内容 |
|------|------|--------|------|
| HOOK | 0–5s | 1 | 抓眼球空镜/情绪 |
| HERO | 5–18s | 2–3 | 产品/品牌核心展示 |
| STORY | 18–25s | 1–2 | 使用场景/情绪共鸣 |
| CTA | 25–30s | 1 | slogan + 落版 |

**骨架落盘**：

- `script`：写入 brief + beat 表意图
- `storyboard`：空组，待脚本转分镜
- `compose`：预置 4–6 路 `videoN` 连线位
- `audio`：可选 BGM 占位节点

**checkpoint**：脚本分镜生成后、分镜批量出图前、进合成前。

### 5.2 叙事短片 `narrative-short`

- LLM 按 **场景（Scene）** 拆分，每场景 2–5 镜
- 支持 **对白时长估算**（借鉴 KupkaProd：字数 × 语速 → `durationSec`）
- `executionMode: checkpoint` 在每个 Scene 末暂停
- 角色圣经多条目 → 分镜 prompt 前缀统一

### 5.3 纪录片蒙太奇 `montage-broll`

- 旁白稿 → 拆为 VO 行 → 每行 1–3 个 B-roll 镜
- 默认 `t2v` 快速铺量；节奏由 `durationSec` 控制
- 合成节点优先；音频节点接旁白 TTS（若已配）

### 5.4 产品展示 `product-demo`

- HERO 镜强制 `i2v` + `ref-sheet`（产品参考图）
- 功能点列表 → 每点 1 镜特写
- 画幅常 16:9 或 9:16（竖屏广告）

---

## 六、Agent 规划算法（复杂片）

### 6.1 流程

```
用户意图
  → 片型分类（规则 + LLM）
  → 若复杂片型：生成 ProductionBrief 草案 → HITL 确认
  → LLM 生成 ShotSpec[]（约束：总时长、画幅、beat 结构）
  → 能力预检（每 mode 所需模型）
  → 选择 expansion 策略
  → buildProductionPlan() → ProductionPlan
  → 预览：Brief 摘要 + 镜头表 + 阶段时间轴 + 骨架图
  → 用户确认 → 落画布
  → 按 phase 触发 DAG / checkpoint
```

### 6.2 与简单片型的关系

- `single-shot` / 明确「一键宣传片」且时长 <10s → 仍可走 **文生图生视频** 单链路 auto
- 检测到 `targetDurationSec > 15` 或多镜头关键词 → **强制升舱** 到 ProductionPlan，不再推荐三节点 auto

### 6.3 LLM 系统提示补充（规划器）

注入：

- 片型节拍表范例（brand-spot 四段）
- ShotSpec JSON Schema
- 端口规则 + productionMode 拓扑
- 项目 `creativeBible` 摘要（若有）
- **禁止** 一次展开超过 12 个 shot 的 full 子图

---

## 七、典型复杂场景（取代简单「咖啡宣传片」单线）

### 场景 D — 30 秒咖啡品牌广告（多 Beat）

1. 用户：「30 秒咖啡品牌广告，电影感，竖屏 9:16，要有咖啡豆特写和手冲画面，最后 slogan 落版」
2. Agent 分类 `brand-spot` → Brief 卡：时长 30、画幅 9:16、beats 四段
3. 用户确认 Brief → 生成 6 镜 ShotSpec（HOOK 1 + HERO 2 + STORY 2 + CTA 1）
4. 预览：镜头表 + 阶段轴 + skeleton（script / storyboard / compose / audio）
5. 确认落盘 → DAG 仅跑 **脚本生成分镜** → checkpoint
6. 用户审阅脚本 → 转分镜组 → `/grid 3x3` → 批量出图 → 逐镜确认 → 批量出视频
7. 进合成剪辑台排列、加 BGM、烧字幕 → 导出

### 场景 E — 2 分钟叙事短片（多场景）

1. 「根据这个故事拍 2 分钟短片，两个角色，室内+室外」
2. `narrative-short` → Brief + 角色圣经 2 条
3. Shot List 按 SC01/SC02/SC03 分组，共 18 镜
4. expansion=skeleton；checkpoint 每场景末
5. 制作中 Agent Build 模式：「给 SC02 第三镜加 flf 转场」→ GraphPatch

### 场景 F — 45 秒产品功能片（参考图锁定）

1. 「45 秒 SaaS 产品广告，界面录屏感 + 功能特写，参考图已选」
2. `product-demo`；Focused Nodes 含参考图 image 节点
3. HERO 镜 `ref-sheet`；其余 `i2v`
4. 缺 Vision LLM 时 blocking → 设置页

### 场景 G — 90 秒自然纪录片风格蒙太奇

1. 「90 秒海洋纪录片风格，旁白驱动，不要对白」
2. `montage-broll` → VO 稿 8 段 → 每段 2 B-roll = 16 镜
3. 默认 `t2v`；compose 长时间线；TTS 旁白节点（可选）

---

## 八、人工检查点矩阵

与 [演进对照 CP0–CP6](./LocalCanvas_Agent-演进对照.md#21-检查点cp用户可感知门禁) 一致。

| CP | 名称 | 用户动作 | UI | Agent 退场后 |
|----|------|----------|-----|--------------|
| CP0 | 简报 | 确认 Brief | Agent Brief 卡 | — |
| CP1 | 镜头表 | 确认/改镜 | Agent Shot List | — |
| CP2 | 脚本 | 改分镜表 | 脚本面板 | **Handoff → 前往脚本** |
| CP3 | 分镜图 | 批阅、重生 | 分镜组宫格 | **Handoff → 打开分镜组** |
| CP4 | 成片 | 选 Take | 分镜+历史 | Handoff → `/run` 提示 |
| CP5 | 装配 | 剪辑 | 剪辑台 | **Handoff → 打开合成** |
| CP6 | 导出 | 编码 | 导出抽屉 | — |

Agent **不得** 跳过 CP0–CP1；CP2 起由 [Handoff 导航](./LocalCanvas_Agent-演进对照.md#五studio-handoff--agent-退场导航) 接管，避免对话窗失联。

**时长校验**：落盘前执行 [§3.3 时长预算](./LocalCanvas_Agent-演进对照.md#33-时长预算校验)。

---

## 九、多 Take 与选优（对标 KupkaProd Reviewer）

**v11 设计、v12 实现**：

| 能力 | 说明 |
|------|------|
| `takesPerShot` | Brief 或设置中默认 1–3 |
| 生成 | 同帧「重生成」写入 history；`generationId` 关联 |
| 选优 | 分镜帧 UI「设为选用」；compose 默认用选用版 |
| Agent Build | 「给镜 3 再跑 2 个 take」→ patch 触发 DAG 子集 |

不引入独立 `reviewer.py` 窗口——**复用分镜组 + 历史面板**，保持工具一体。

---

## 十、实现路线（与 Slice 对齐）

> 以 [演进对照 §1.2](./LocalCanvas_Agent-演进对照.md#12-v110-范围收紧与详案对齐) 为 v11.0 真相源。

| 版本 | 交付 | 复杂片支持度 |
|------|------|--------------|
| v11.0 A | 模板召回、Settings、Preferences | 片型标签只读（可选），**无 Brief 确认流** |
| v11.1 B | GraphPatch、Handoff、不自动 startRun | checkpoint 最小策略 |
| v11.2 C | Phase Rail、Brief 字段可编辑 | Shot List 折叠预览 |
| v12.0 | `buildProductionPlan`、§三落盘契约 | skeleton + 时长校验 |
| v12.1 | per-shot、多 Take | ref-sheet |
| v12.2 | Scene 分组 DAG、ST 冒烟测试 | 2min+ 短片 |

---

## 十一、与 ComfyUI 后期管线的关系

ComfyUI 常将 **超分 / 插帧** 作为独立分组。LocalCanvas 当前以 **合成导出** 为终点，后期增强不纳入 Agent 自动链，仅在 ProductionPlan 加 **可选备注节点**（text 类型「后期说明」）或导出后外链 ComfyUI——避免本地工程失控膨胀。

---

## 相关文档

- [演进对照](./LocalCanvas_Agent-演进对照.md) — ShotSpec 映射、Handoff、测试 ST-*
- [Agent 功能设计](./LocalCanvas_Agent功能设计.md)
- [Agent UI 设计](./LocalCanvas_Agent-UI设计.md)
- [工作流模板](../v4/workflow-templates.md)
