# LocalCanvas v8 — 界面与体验重设计

> **版本目标**：在 v6「功能正确」之上，完成**编辑器壳层、信息架构、视觉语言**的统一——让用户在同一套界面语法里完成「搭流程 → 生成 → 剪辑导出」，而不是在 5 个 Tab、浮层和全屏面板之间来回找  
> **预计周期**：3 周（15 个工作日，分三波交付）  
> **前置条件**：v6 合成剪辑台、文本双栏、Capability Registry 验收通过  
> **生成日期**：2026-06-06  
> **设计详案**：`docs/v8/design/`（本目录 `./design/`）（三份界面专文 + 图片节点专文）  
> **立场**：v8 **不新增大型业务能力**，只回答：**现有能力怎样排布、怎样呈现、怎样减少打断？**

---

## 〇·一、实施进度（2026-06-06）

> 以下为当前代码库已落地项；未列出的仍按 §九 路线图推进。

| 模块 | 状态 | 说明 |
|------|------|------|
| EditorShell + Legacy 双轨 | ✅ | `App.tsx` 按 `isEditorShell()` 切换；设置可强制经典布局 |
| TopBar / Dock / Inspector | ✅ | `src/components/shell/` |
| 三模式 canvas / generate / edit | ✅ | `src/layouts/modes/` |
| GeneratorDrawer | ✅ | 底部抽屉替代居中 `GeneratorPanel` |
| **图片 ImageEditorPanel** | ✅ | Phase 0–2，见 [图片节点与生成器重设计](./design/LocalCanvas_图片节点与生成器重设计.md) §十三 |
| AgentCompanion | ✅ | 浮岛包装现有 AgentPanel |
| Shortcuts `?` + CoachMark | ✅ | `ShortcutsOverlay` / `EditorCoachMark` |
| StartPage v8 卡片 | 🔶 | 模板入口部分落地 |
| Settings 界面分区 | 🔶 | 能力卡片化进行中 |
| Design Token studio 命名空间 | ✅ | `theme.css` / `index.css` |

**图例**：✅ 已交付　🔶 部分完成　⬜ 未开始

---

## 零、版本定位

### 0.1 与 v6 的关系

| v6 已解决 | v8 继续解决 |
|-----------|-------------|
| 合成剪辑台、文本 draft/output、非法连线阻断 | 面板分散、视觉割裂、主路径切换成本高 |
| Agent / DAG / 分镜组能力齐备 | 新用户不知「先开哪个 Tab」 |
| 能力 Registry 让连线可信 | 设置页、启动页仍像配置工具而非创作入口 |

v8 是 **v6 的体验层收官**：功能不减、入口重组、语气统一。

### 0.2 设计诊断：v6 末期的 UX 债务

| 症状 | 根因 | v8 解法 |
|------|------|---------|
| 左侧 5 Tab + 画布 + 生成器 + 剪辑台 + Agent **同屏抢焦点** | 功能按类型分栏，未按任务分场景 | **三模式布局** + **Dock 单抽屉** |
| 选中节点后，生成器与 Inspector 信息重复 | 缺少统一的「选中上下文」区域 | **右侧 Inspector** 聚合节点详情与快捷操作 |
| GeneratorPanel 遮挡画布中心 | 居中浮层不适合长表单 | **底部 Generator Drawer**，可拖拽高度 |
| Agent 占整栏 Tab，与画布争宽 | 对话不是始终主任务 | **Agent 伴随浮岛**，可钉住/收起 |
| 合成台与画布像两个产品 | 独立迭代、Token 不一致 | **共享 TopBar + Design Token** |
| 启动页像文件管理器 | 未传达「打开后去哪」 | **启动页 v8**：最近项目 + 模板 + 上次模式 |
| 快捷键分散 | 无统一交互文档 | **快捷键面板 `?`** + 首次 Coach Mark |

### 0.3 成功标准（版本级）

| 指标 | 目标 |
|------|------|
| 主路径效率 | 「搭一条文本→图片→合成→导出」路径，**手动切换侧边 Tab ≤ 3 次**（v6 基线约 8 次） |
| 首屏认知 | 新用户 60s 内能说出当前处于「画布 / 生成 / 剪辑」哪一模式（Coach 后问卷 ≥ 75%） |
| 面板遮挡 | 生成器打开时，画布可见区域 **≥ 50%**（v6 约 30%） |
| Agent 参与 | 浮岛 Agent 消息已读率 **≥ v6 侧栏 Tab** |
| 视觉一致 | 画布 / 剪辑台 / 设置共用 Token，v8 新代码 **零硬编码 `#333`** |
| 性能 | 模式切换动画 200ms；编辑器首帧 LCP ≤ 1.2s（本地基准机） |

---

## 一、设计原则

1. **任务优先，非功能优先** — 按「编排 / 生成 / 剪辑」组织界面，而非按「节点 / 工具 / 资产 / 历史 / Agent」。
2. **一主一辅** — 任意时刻 **1 个主工作区 + 1 个辅面板**（Inspector 或事件流）；禁止三列同等权重。
3. **选中即上下文** — 选中节点/边/片段后，右侧 Inspector 展示一切相关操作；避免用户「找面板」。
4. **渐进披露** — 模型 endpoint、端口类型、DAG 细节默认折叠；常用操作一级可见。
5. **非阻断反馈** — 生成等待、保存、Agent 规划用 Drawer 内状态 / Toast / 顶栏 Badge，不用全屏 Modal。
6. **可逆与可逃** — 保留 **经典布局** 开关（v6 完整 Sidebar 结构），Settings 一键切回。
7. **键盘友好** — 高频操作有快捷键；`?` 随时查看 cheatsheet。
8. **本地创作感** — Studio Dark：低饱和、大留白、轻动效；避免 SaaS 仪表盘式密度。

---

## 二、视觉语言（Design Token 摘要）

> 完整 Token 表见 [v8/design/01_视觉语言与设计令牌.md](./design/01_视觉语言与设计令牌.md)

### 2.1 语义色

| Token | 用途 | 值（暗色） |
|-------|------|------------|
| `--studio-bg` | 编辑器主背景 | `#0f1117` |
| `--studio-surface` | 面板 / 抽屉 | `rgba(255,255,255,0.03)` |
| `--studio-accent` | 主强调（选中、主按钮） | `#6366f1` indigo-500 |
| `--mode-canvas` | 画布模式指示 | `#6366f1` |
| `--mode-generate` | 生成模式指示 | `#f59e0b` amber-500 |
| `--mode-edit` | 剪辑模式指示 | `#64748b` slate-500 |
| `--status-running` | DAG / 生成中 | `#38bdf8` |
| `--status-error` | 错误 | `#f87171` |

### 2.2 字体阶梯

| 级别 | 场景 | 规格 |
|------|------|------|
| Display | 启动页标题、模式名 | 24px / 600 |
| Body | 面板正文、Inspector | 14px / 400 |
| Caption | 保存状态、时间戳 | 12px / `text-zinc-500` |
| Mono | 时间码、进度百分比 | 13px `ui-monospace` |

### 2.3 动效常量

| 名称 | 时长 | 用途 |
|------|------|------|
| `mode-crossfade` | 200ms ease-out | 三模式切换 |
| `drawer-slide` | 250ms ease-out | Generator / 资产抽屉 |
| `dock-expand` | 180ms ease-out | Dock 抽屉展开 |

---

## 三、空间架构：EditorShell

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar — 项目 · 模式切换 · 保存 · DAG 状态 · 账户            │
├────┬────────────────────────────────────────────┬───────────┤
│Dock│  MainWorkspace（随模式变化）                 │ Inspector │
│56px│  canvas | generate-focus | compose          │ 280px     │
├────┴────────────────────────────────────────────┴───────────┤
│  GeneratorDrawer（按需，底部 40%） · AgentCompanion（浮岛）   │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 TopBar

```
┌──────────────────────────────────────────────────────────────┐
│ ◉ LocalCanvas   项目名 ▾ · 已保存   [画布|生成|剪辑]   DAG 👤 │
└──────────────────────────────────────────────────────────────┘
```

| 元素 | 行为 |
|------|------|
| 项目名 ▾ | 重命名、打开目录、返回启动页 |
| 保存状态 | 已保存 / 保存中 / 未保存（点击手动保存） |
| ModeSwitcher | 三模式胶囊；选中合成节点时可自动建议「剪辑」 |
| DAG | 运行中显示进度 Badge；点击展开 DagRunPanel |
| 👤 | AccountMenu（与 v6 一致） |

### 3.2 Dock（取代 Sidebar 5-Tab）

左侧 **图标 Dock**（56px），点击展开抽屉；**同时最多 1 个抽屉打开**。

| 图标 | 抽屉内容 | 默认 |
|------|----------|------|
| ⊕ 节点 | NodePanel — 拖入创建 | 画布模式常开 |
| 🔧 工具 | ToolPanel — 工作流、布局 | 按需 |
| 📁 资产 | AssetPanel | 按需 |
| 🕐 历史 | HistoryPanel — 生成记录 | 按需 |
| ⚙ 设置 | 快捷跳转 Settings（或内嵌精简项） | 按需 |

> Agent **不再占 Dock 位**，改为右下浮岛（见 §5.3）。

### 3.3 Inspector（右侧固定）

选中对象时显示；无选中时显示 **项目摘要**（节点数、最近生成、快捷「新建文本节点」）。

| 选中对象 | Inspector 内容 |
|----------|----------------|
| 文本节点 | draft/output 摘要、outputMode、打开双栏编辑 |
| 图片/视频/音频 | 预览、路径、重新生成入口 |
| 合成节点 | 片段数、打开剪辑台、导出状态 |
| 边 | 数据类型、能力警告（Registry）、断开 |
| 无选中 | 项目统计 + 建议下一步 |

Inspector 宽 280px，可拖至 360px；`localStorage` 记忆宽度。

---

## 四、三模式布局

> 详规见 [v8/design/02_编辑器壳层与三模式布局.md](./design/02_编辑器壳层与三模式布局.md)

### 4.1 画布模式 `canvas`（默认）

**用户任务**：搭建节点、连线、组织工作流。

```
┌────┬──────────────────────────────────────┬───────────┐
│Dock│  Canvas（React Flow 全高）            │ Inspector │
│    │  + CanvasToolbar + MiniMap（可选）    │           │
└────┴──────────────────────────────────────┴───────────┘
```

- 与 v6 画布能力 **100% 保留**；变的是外壳，不是节点语义。
- GeneratorPanel **不再居中浮层**；选中可生成节点后，自动打开底部 Drawer 或提示 Inspector 内「生成」按钮。
- ComposeEditor：选中合成节点时 **不自动全屏**；Inspector 提供「打开剪辑台」，用户主动进入剪辑模式。

### 4.2 生成模式 `generate`

**用户任务**：专注填写 prompt、选模型、查看生成结果与历史。

```
┌────┬──────────────────────────────────────┬───────────┐
│Dock│  节点大图预览 / 多版本对比（若有）      │ 参数表单   │
│    │  + 生成历史条（底部横向）              │ 能力警告   │
└────┴──────────────────────────────────────┴───────────┘
```

- 由「选中单个可生成节点 + 按 G 或 Inspector 生成按钮」进入。
- 主区放大节点预览；右栏复用 Generator 表单逻辑。
- Esc 或 ModeSwitcher 回画布模式。

### 4.3 剪辑模式 `edit`

**用户任务**：排序、裁切、字幕、导出 MP4。

```
┌──────────────────────────────────────────────────────────┐
│ ComposeEditor 75%–100% 高（记忆上次比例）                  │
│ 顶栏：片段数 · 时长 · 导出 · 返回画布                        │
└──────────────────────────────────────────────────────────┘
```

- 复用 v6 `ComposeEditor`；`variant="shell"` 接入 TopBar 视觉。
- 「返回画布」切回 canvas 模式，**不**关闭项目。
- Dock 在剪辑模式默认收起，Inspector 隐藏（检查器由 ComposeEditor 内置）。

### 4.4 模式推导（可选自动）

```typescript
type EditorMode = 'canvas' | 'generate' | 'edit'

function suggestMode(ctx: {
  selectedNodeType?: string
  composeEditorOpen?: boolean
  userLocked?: boolean
}): EditorMode {
  if (ctx.userLocked) return ctx.currentMode
  if (ctx.composeEditorOpen || ctx.selectedNodeType === 'compose') return 'edit'
  if (ctx.selectedNodeType && GENERATABLE_TYPES.has(ctx.selectedNodeType)) {
    return ctx.lastExplicitMode ?? 'canvas' // 不强制跳 generate，仅 Inspector 提示
  }
  return 'canvas'
}
```

**默认不强制自动切换模式**，避免打断；TopBar 显示「建议：剪辑模式」轻提示即可。

---

## 五、关键界面重设计

### 5.1 启动页

| v6 问题 | v8 设计 |
|---------|---------|
| 列表像资源管理器 | 卡片：缩略图（画布截图或首帧）、节点数、上次打开时间 |
| 新建后不知下一步 | 模板入口：**空白画布 / 分镜组 / 文本→视频最小链路** |
| 视觉与编辑器断裂 | 复用 `--studio-bg` 与 Display 字体 |

```
┌─────────────────────────────────────────────────────────┐
│  LocalCanvas                              设置 · 账户      │
│                                                         │
│     最近项目                                             │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│     │ 缩略图   │ │ 缩略图   │ │  + 新建  │                  │
│     │ 12 节点  │ │ 8 节点   │ │         │                  │
│     └─────────┘ └─────────┘ └─────────┘                  │
│                                                         │
│     从模板开始：空白 · 分镜组 · 文本→视频                  │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Generator — 底部 Drawer

| 项 | 规格 |
|----|------|
| 触发 | 选中可生成节点 · Inspector「生成」· 快捷键 `G` |
| 高度 | 默认 40% viewport；拖至 70%；按用户记忆 |
| 结构 | 顶：节点名 + 关闭 · 中：表单 · 底：生成 / 取消 |
| 能力警告 | 非法连线 **阻断生成按钮**（v6 Registry 逻辑不变） |
| 进行中 | Drawer 内进度条 + 可收起；不阻塞画布其余区域 |

### 5.3 Agent — 伴随浮岛

| 项 | 规格 |
|----|------|
| 默认 | 右下 56px 圆钮；未读时 indigo 脉动 |
| 展开 | 320×480 max 卡片；可 **钉住** 到右侧（与 Inspector 互斥，钉住时 Inspector 折叠） |
| WorkflowPlan | 默认折叠；用户点击「查看规划」展开，**不**自动全屏 |
| 与生成 | Agent 建议生成时，打开 Generator Drawer 并预填参数 |

### 5.4 设置页 — 能力卡片化

- 模型行 → **卡片**：名称、模态图标、置信度、上次 Probe 时间。
- 新增 **界面** 分区：经典布局开关、Inspector 默认宽、MiniMap 默认、Coach 重置。
- API 与 v6 不变，只改 presentation。

### 5.5 经典布局（Legacy）

Settings「使用经典布局（v6）」→ 渲染 v6 完整 `Sidebar` + 居中 `GeneratorPanel` 结构。  
用于老用户过渡；**不删除 v6 代码路径**。

---

## 六、微交互与反馈

> 详规见 [v8/design/03_交互语法与微反馈.md](./design/03_交互语法与微反馈.md)

### 6.1 全局反馈层级

| 层级 | z-index | 用途 |
|------|---------|------|
| CoachMark | 110 | 首次引导 |
| Toast | 100 | 错误、保存成功 |
| Modal | 95 | 确认删除等少数场景 |
| GeneratorDrawer | 80 | 生成 |
| AgentCompanion | 70 | 对话 |
| DagRunPanel | 75 | DAG 详情（可拖拽） |

### 6.2 生成等待

- Drawer 内 spinner + 文案「生成中…」+ 取消（若适配器支持）。
- 顶栏 DAG Badge 同步（批量运行时）。
- **禁止**全屏 blocking loading（v6 GeneratorPanel 部分场景存在此问题）。

### 6.3 保存与脏状态

- TopBar 项目名旁：`· 已保存` / `· 未保存` /  spinner `保存中`
- 离开项目时保留 v6 ConfirmDialog 逻辑

---

## 七、响应式与无障碍

| 断点 | 行为 |
|------|------|
| ≥1280px | Dock + Main + Inspector 三列 |
| 1024–1279 | Inspector 默认折叠为图标，点击 overlay 展开 |
| 800–1023 | Dock 抽屉改 bottom sheet |
| <800 | 仅保证 canvas + Drawer；edit 模式提示加宽窗口 |

无障碍：

- ModeSwitcher：`role="tablist"` + `aria-selected`
- Inspector：焦点陷阱仅在 mobile overlay 打开时
- Reduced motion：跳过 mode crossfade，instant switch

---

## 八、Feature Flag 与迁移

| Flag | 默认 | 说明 |
|------|------|------|
| `VITE_EDITOR_SHELL` | off → beta 后 on | 总开关 EditorShell |
| `VITE_EDITOR_COACH` | on | 首次 Coach Mark |
| `VITE_LEGACY_LAYOUT` | off | 强制经典布局 |

**迁移**：

1. `App.tsx`：`EDITOR_SHELL ? <EditorShell /> : <LegacyAppLayout />`
2. 现有 stores / IPC **不改**；仅搬迁组件挂载位置
3. Release note：经典布局可在设置中永久启用

---

## 九、功能清单

| # | 模块 | 子功能 | 优先级 |
|---|------|--------|--------|
| **A. 壳层** |
| 1 | EditorShell | TopBar + ModeSwitcher + 保存状态 | P0 |
| 2 | Dock | 图标 Dock + 单抽屉互斥 | P0 |
| 3 | Inspector | 选中上下文 + 项目摘要 | P0 |
| **B. 三模式** |
| 4 | canvas | 画布 + Toolbar，去居中 Generator | P0 |
| 5 | generate | 专注生成布局 + 历史条 | P1 |
| 6 | edit | ComposeEditor 接入 Shell | P0 |
| **C. 体验组件** |
| 7 | GeneratorDrawer | 底部抽屉 + 能力阻断 | P0 |
| 8 | AgentCompanion | 浮岛 + 钉住 | P1 |
| 9 | Shortcuts | `?` cheatsheet + Coach | P1 |
| **D. 启动与设置** |
| 10 | StartPage | 卡片 + 模板 | P1 |
| 11 | Settings | 界面分区 + 能力卡片 | P2 |
| **E. 设计系统** |
| 12 | Tokens | theme.css studio 命名空间 | P0 |
| 13 | Legacy | 经典布局开关 | P0 |
| 14 | a11y | tablist + reduced motion | P2 |

---

## 十、实施路线图（三波）

### Wave 1 — 壳与 Inspector（5 天）

- 抽取 `LegacyAppLayout`（v6 现状）
- `EditorShell` + TopBar + Dock + Inspector 骨架
- Design Token 入库
- 验收：画布模式可正常连线、选中节点 Inspector 有内容

### Wave 2 — Drawer 与模式（5 天）

- GeneratorDrawer 替代居中 GeneratorPanel
- edit 模式接入 ComposeEditor
- AgentCompanion 浮岛（保留原 AgentPanel 逻辑）
- 验收：主路径 Tab 切换 ≤ 3 次；生成时画布可见 ≥ 50%

### Wave 3 — 启动页与打磨（5 天）

- StartPage v8、Coach Mark、`?` 快捷键
- Settings 界面分区 + 能力卡片
- generate 模式、响应式断点
- 验收：`npm test` 全绿 + 成功标准抽样

---

## 十一、验收指标

| ID | 假设 | 失败信号 |
|----|------|----------|
| **U1** | Dock 比 5 Tab 更快找到目标面板 | 用户仍主要靠右键菜单完成主路径 |
| **U2** | Inspector 减少重复打开生成器 | 生成模式下手动打开 Drawer 占比 < 30% |
| **U3** | 底部 Drawer 比居中面板更少遮挡投诉 | 用户反馈「挡住画布」较 v6 下降 50% |
| **U4** | Agent 浮岛提高阅读率 | 已读率低于 v6 侧栏 Tab |
| **U5** | Token 统一提升「像一个产品」感 | 设置页与编辑器割裂反馈持续 |

---

## 附录 A：文件结构（规划）

```
src/
  layouts/
    EditorShell.tsx
    LegacyAppLayout.tsx      # v6 完整结构
    modes/
      CanvasMode.tsx
      GenerateMode.tsx
      EditMode.tsx
  components/
    shell/
      TopBar.tsx
      Dock.tsx
      Inspector.tsx
      ModeSwitcher.tsx
    agent/
      AgentCompanion.tsx     # 包装现有 AgentPanel
  hooks/
    useEditorMode.ts
  constants/
    editorFeatures.ts
docs/v8/design/
  01_视觉语言与设计令牌.md
  02_编辑器壳层与三模式布局.md
  03_交互语法与微反馈.md
  LocalCanvas_图片节点与生成器重设计.md   # ✅ Phase 0–2 已实施
  04_Inspector与Drawer职责划分.md          # 草案：检查器 vs 底部编辑面板
```

---

## 附录 B：结语

> v6 让 LocalCanvas **能用**；v8 让它 **不用想界面在哪**。

若 v8 成功，用户不会评价「模式多不多」，而会说：**「我知道自己在搭流程、还是在导出。」**

---

*本文档随实现迭代；若某模式增加步骤而非减少，应简化该模式而非加功能。*
